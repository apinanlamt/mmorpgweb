const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require('socket.io');
const User = require('./models/user');
const Player = require('./models/player');
const itemsConfig = require('./config/items');
const questsConfig = require('./config/quests');
const monsterSystem = require('./monsterSystem');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// เชื่อม MongoDB
mongoose.connect('mongodb+srv://mmorpgUser:mmorpg-web@mmorpg-web.nlfivlm.mongodb.net/?retryWrites=true&w=majority&appName=mmorpg-web', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected!'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false
}));

// ให้บริการไฟล์ static client
app.use(express.static('public'));

// --- Authentication APIs ---

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing username or password');
  try {
    let existing = await User.findOne({ username });
    if (existing) return res.status(400).send('Username already taken');

    const user = new User({ username });
    await user.setPassword(password);

    const player = new Player({ username });
    await player.save();

    user.playerData = player._id;
    await user.save();

    req.session.userId = user._id;
    res.send({ success: true, player });
  } catch (e) {
    res.status(500).send('Error registering user');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username }).populate('playerData');
    if (!user) return res.status(401).send('Invalid username or password');
    const valid = await user.validatePassword(password);
    if (!valid) return res.status(401).send('Invalid username or password');
    req.session.userId = user._id;
    res.send({ success: true, player: user.playerData });
  } catch (e) {
    res.status(500).send('Login error');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.send({ success: true });
});

// --- Middleware share session ให้ socket.io ---
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false
})));

// ตรวจสอบ session ก่อนเชื่อมต่อ socket
io.use((socket, next) => {
  if (socket.request.session && socket.request.session.userId) {
    return next();
  }
  next(new Error('Unauthorized'));
});

// เก็บข้อมูลผู้เล่นออนไลน์ (socket.id -> Player document)
const onlinePlayers = new Map();

io.on('connection', async (socket) => {
  const userId = socket.request.session.userId;
  const user = await User.findById(userId).populate('playerData');
  if (!user) return socket.disconnect();

  // บันทึก player ไว้ map
  onlinePlayers.set(socket.id, user.playerData);

  // ส่งข้อมูลเริ่มต้นให้ client
  socket.emit('init', {
    player: user.playerData,
    monsters: monsterSystem.getMonsters(),
    quests: questsConfig,
    items: itemsConfig
  });

  // แจ้งผู้เล่นคนอื่นว่ามีคนเข้าร่วม
  socket.broadcast.emit('playerJoined', { playerId: socket.id, username: user.username });

  // --- Event: ย้ายตำแหน่งผู้เล่น ---
  socket.on('move', async ({ x, y }) => {
    const player = onlinePlayers.get(socket.id);
    if (!player) return;

    player.x = x;
    player.y = y;
    await player.save();

    io.emit('playerMoved', { playerId: socket.id, x, y });
  });

  // --- Event: ตีมอนสเตอร์ ---
  socket.on('attackMonster', async ({ monsterId }) => {
    const player = onlinePlayers.get(socket.id);
    if (!player) return;

    const dead = monsterSystem.damageMonster(monsterId, 10);
    if (dead) {
      player.exp += 20;

      // อัพเดตเควสต์ที่เกี่ยวกับการฆ่ามอนสเตอร์
      for (let quest of player.quests) {
        if (quest.status === 'active') {
          const questData = questsConfig.find(q => q.id === quest.questId);
          if (questData && questData.type === 'killMonster' && questData.targetId === monsterId) {
            quest.progress = (quest.progress || 0) + 1;
            if (quest.progress >= questData.required) {
              quest.status = 'completed';
              // ให้รางวัล (เพิ่มเงิน, exp, หรือไอเทม) -- ตัวอย่าง:
              player.exp += questData.rewardExp || 0;
              // เพิ่มไอเทมถ้ามี
              if (questData.rewardItemId) {
                const invItem = player.inventory.find(i => i.itemId === questData.rewardItemId);
                if (invItem) {
                  invItem.count += 1;
                } else {
                  player.inventory.push({ itemId: questData.rewardItemId, count: 1 });
                }
              }
            }
          }
        }
      }

      // เลเวลอัพถ้าครบ exp
      if (player.exp >= player.level * 100) {
        player.level++;
        player.exp = 0;
        player.hp = player.maxHp;
        socket.emit('levelUp', { level: player.level });
      }

      await player.save();
      io.emit('monsterDefeated', monsterId);
      socket.emit('questUpdate', player.quests);
    } else {
      io.emit('monsterDamaged', { monsterId });
    }
  });

  // --- Event: PvP ตีผู้เล่นอื่น ---
  socket.on('attackPlayer', async ({ targetSocketId }) => {
    const attacker = onlinePlayers.get(socket.id);
    const target = onlinePlayers.get(targetSocketId);
    if (!attacker || !target) return;

    target.hp -= 10;
    if (target.hp <= 0) {
      target.hp = 0;
      io.to(targetSocketId).emit('defeated');

      // รีสปอน (ตัวอย่างตำแหน่ง)
      target.x = 100;
      target.y = 100;
      target.hp = target.maxHp;
    }
    await target.save();

    io.emit('playerHpUpdate', { playerId: targetSocketId, hp: target.hp });
  });

  // --- Event: ซื้อของจาก Shop ---
  socket.on('buyItem', async ({ itemId }) => {
    const player = onlinePlayers.get(socket.id);
    if (!player) return;
    const item = itemsConfig.find(i => i.id === itemId);
    if (!item) return;

    // สมมติ player มี gold ใน inventory (itemId = 'gold')
    const gold = player.inventory.find(i => i.itemId === 'gold');
    if (!gold || gold.count < item.price) {
      socket.emit('shopError', 'Not enough gold');
      return;
    }

    // หัก gold
    gold.count -= item.price;

    // เพิ่มไอเทมใน inventory
    const invItem = player.inventory.find(i => i.itemId === itemId);
    if (invItem) {
      invItem.count += 1;
    } else {
      player.inventory.push({ itemId, count: 1 });
    }
    await player.save();

    socket.emit('shopSuccess', { itemId, newGold: gold.count });
    socket.emit('inventoryUpdate', player.inventory);
  });

  // --- Event: Chat ---
  socket.on('chatMessage', (msg) => {
    io.emit('chatMessage', { username: user.username, message: msg });
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    onlinePlayers.delete(socket.id);
    io.emit('playerLeft', socket.id);
  });
});

// --- Spawn มอนสเตอร์ ทุก 30 วินาที ---
setInterval(() => {
  const newMonster = monsterSystem.spawnMonster();
  io.emit('monsterSpawned', newMonster);
}, 30000);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
