const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const Player = require('./models/player');
const { spawnMonster, monsters } = require('./monsterSystem');
const chatHistory = [];

// เชื่อมต่อ MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mmorpg_web';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

app.use(express.static(__dirname + '/public'));

let players = {};

io.on('connection', async (socket) => {
    console.log(`Player connected: ${socket.id}`);

    let player = await Player.findOne({ socketId: socket.id });
    if (!player) {
        player = new Player({ socketId: socket.id, x: 100, y: 100, hp: 100, inventory: [], quests: [] });
        await player.save();
    }
    players[socket.id] = player;

    socket.emit('init', { players, monsters, chatHistory });
    socket.broadcast.emit('newPlayer', player);

    socket.on('move', async (data) => {
        player.x = data.x;
        player.y = data.y;
        await player.save();
        socket.broadcast.emit('playerMoved', player);
    });

    socket.on('chat', (msg) => {
        chatHistory.push(msg);
        io.emit('chat', msg);
    });

    socket.on('attack', (monsterId) => {
        if (monsters[monsterId]) {
            monsters[monsterId].hp -= 10;
            if (monsters[monsterId].hp <= 0) {
                delete monsters[monsterId];
                io.emit('monsterDefeated', monsterId);
            } else {
                io.emit('monsterAttacked', { id: monsterId, hp: monsters[monsterId].hp });
            }
        }
    });

    socket.on('disconnect', async () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
        await Player.deleteOne({ socketId: socket.id });
    });
});

spawnMonster(io);

http.listen(process.env.PORT || 3000, () => {
    console.log('Server running on port', process.env.PORT || 3000);
});
