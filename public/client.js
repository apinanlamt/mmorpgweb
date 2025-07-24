const socket = io();

// ตัวแปรเก็บข้อมูลผู้เล่นและเกม
let player = null;
let monsters = [];
let quests = [];
let items = [];
let playersOnline = {};

// UI element
const hpBar = document.getElementById('hpBar');
const expBar = document.getElementById('expBar');
const questsList = document.getElementById('questsList');
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const gameMap = document.getElementById('gameMap');

// รับข้อมูลเริ่มต้น
socket.on('init', (data) => {
  player = data.player;
  monsters = data.monsters;
  quests = data.quests;
  items = data.items;
  playersOnline[socket.id] = { username: player.username, x: player.x, y: player.y };

  updateUI();
  renderMap();
});

// อัปเดต UI
function updateUI() {
  if (!player) return;
  hpBar.style.width = (player.hp / player.maxHp) * 100 + '%';
  expBar.style.width = (player.exp / (player.level * 100)) * 100 + '%';

  questsList.innerHTML = '';
  player.quests?.forEach(q => {
    const li = document.createElement('li');
    li.textContent = `Quest: ${q.questId} - ${q.status} (${q.progress})`;
    questsList.appendChild(li);
  });
}

// แสดงแผนที่
function renderMap() {
  gameMap.innerHTML = '';

  // แสดงผู้เล่น
  for (const [id, p] of Object.entries(playersOnline)) {
    const el = document.createElement('div');
    el.className = 'player';
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    el.textContent = p.username;
    gameMap.appendChild(el);
  }

  // แสดงมอนสเตอร์
  monsters.forEach(m => {
    const el = document.createElement('div');
    el.className = 'monster';
    el.style.left = m.x + 'px';
    el.style.top = m.y + 'px';
    el.textContent = m.name + ` (${m.hp})`;
    el.onclick = () => attackMonster(m.id);
    gameMap.appendChild(el);
  });
}

// การเคลื่อนที่ WASD + Arrow
document.addEventListener('keydown', (e) => {
  if (!player) return;
  let moved = false;
  switch(e.key) {
    case 'ArrowUp':
    case 'w':
      player.y -= 10; moved = true; break;
    case 'ArrowDown':
    case 's':
      player.y += 10; moved = true; break;
    case 'ArrowLeft':
    case 'a':
      player.x -= 10; moved = true; break;
    case 'ArrowRight':
    case 'd':
      player.x += 10; moved = true; break;
  }
  if (moved) {
    socket.emit('move', { x: player.x, y: player.y });
    renderMap();
  }
});

// PvP ตีผู้เล่นอื่นด้วยการคลิก
gameMap.addEventListener('click', (e) => {
  const clicked = e.target;
  if (clicked.className === 'player' && clicked.textContent !== player.username) {
    const targetUsername = clicked.textContent;
    const targetId = Object.keys(playersOnline).find(id => playersOnline[id].username === targetUsername);
    if (targetId) {
      attackPlayer(targetId);
    }
  }
});

// อัปเดตตำแหน่งผู้เล่น
socket.on('playerMoved', ({ playerId, x, y }) => {
  if (!playersOnline[playerId]) {
    playersOnline[playerId] = { username: 'Unknown', x, y };
  } else {
    playersOnline[playerId].x = x;
    playersOnline[playerId].y = y;
  }
  renderMap();
});

// จัดการผู้เล่นเข้า/ออก
socket.on('playerJoined', ({ playerId, username }) => {
  playersOnline[playerId] = { username, x: 0, y: 0 };
  renderMap();
});
socket.on('playerLeft', (playerId) => {
  delete playersOnline[playerId];
  renderMap();
});

// รับ HP ของผู้เล่นอื่น
socket.on('playerHpUpdate', ({ playerId, hp }) => {
  if (playersOnline[playerId]) {
    playersOnline[playerId].hp = hp;
  }
});

// แชท
socket.on('chatMessage', ({ username, message }) => {
  const p = document.createElement('p');
  p.textContent = `${username}: ${message}`;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const msg = chatInput.value.trim();
    if (msg.length > 0) {
      socket.emit('chatMessage', msg);
      chatInput.value = '';
    }
  }
});

// ตีมอนสเตอร์
function attackMonster(monsterId) {
  socket.emit('attackMonster', { monsterId });
}

// PvP
function attackPlayer(targetSocketId) {
  socket.emit('attackPlayer', { targetSocketId });
}

// Level Up
socket.on('levelUp', ({ level }) => {
  alert(`🎉 Level Up! Now at level ${level}`);
});

// มอนสเตอร์โดนตี/ตาย
socket.on('monsterDamaged', ({ monsterId }) => {
  const m = monsters.find(m => m.id === monsterId);
  if (m) m.hp -= 10;
  renderMap();
});
socket.on('monsterDefeated', (monsterId) => {
  monsters = monsters.filter(m => m.id !== monsterId);
  renderMap();
});

// มอนสเตอร์ใหม่เกิด
socket.on('monsterSpawned', (monster) => {
  monsters.push(monster);
  renderMap();
});

// เพิ่มปุ่มตีบวกอุปกรณ์
document.getElementById('upgradeWeaponBtn')?.addEventListener('click', () => {
  fetch('/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'weapon' })
  }).then(res => res.json()).then(data => {
    if (data.success) {
      alert('Weapon upgraded!');
    } else {
      alert('Upgrade failed!');
    }
  });
});

document.getElementById('upgradeArmorBtn')?.addEventListener('click', () => {
  fetch('/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'armor' })
  }).then(res => res.json()).then(data => {
    if (data.success) {
      alert('Armor upgraded!');
    } else {
      alert('Upgrade failed!');
    }
  });
});
