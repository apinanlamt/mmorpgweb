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
    }, 15000); // spawn มอนทุก 15 วินาที
}

module.exports = { spawnMonster, monsters };