const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/mmorpg_web', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
}

module.exports = connectDB;

// File: models/player.js
const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    socketId: String,
    x: Number,
    y: Number,
    hp: Number,
    inventory: [String],
    quests: [{ name: String, completed: Boolean }]
});

module.exports = mongoose.model('Player', playerSchema);

// File: monsterSystem.js
const monsters = {};

function spawnMonster(io) {
    setInterval(() => {
        const id = 'monster_' + Date.now();
        monsters[id] = {
            id,
            x: Math.random() * 800,
            y: Math.random() * 600,
            hp: 50
        };
        io.emit('spawnMonster', monsters[id]);
    }, 15000); // Spawn every 15 sec
}

module.exports = { spawnMonster, monsters };