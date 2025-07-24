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