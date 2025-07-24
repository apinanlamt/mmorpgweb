const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);
let socket;
let player;
let otherPlayers;
let monsters;

function preload() {
    this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
    this.load.image('monster', 'https://labs.phaser.io/assets/sprites/space-baddie.png');
}

function create() {
    const self = this;
    otherPlayers = this.physics.add.group();
    monsters = this.physics.add.group();

    socket = io();

    socket.on('init', (data) => {
        Object.values(data.players).forEach(p => addPlayer(self, p));
        Object.values(data.monsters).forEach(m => addMonster(self, m));
        data.chatHistory.forEach(msg => appendChat(msg));
    });

    socket.on('newPlayer', p => addOtherPlayer(self, p));
    socket.on('playerMoved', p => {
        otherPlayers.getChildren().forEach(op => {
            if (p.socketId === op.playerId) op.setPosition(p.x, p.y);
        });
    });
    socket.on('playerDisconnected', id => {
        otherPlayers.getChildren().forEach(op => {
            if (id === op.playerId) op.destroy();
        });
    });

    socket.on('spawnMonster', m => addMonster(self, m));
    socket.on('monsterAttacked', m => {
        monsters.getChildren().forEach(mon => {
            if (mon.monsterId === m.id) mon.hp = m.hp;
        });
    });
    socket.on('monsterDefeated', id => {
        monsters.getChildren().forEach(mon => {
            if (mon.monsterId === id) mon.destroy();
        });
    });

    document.getElementById('chatInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const msg = e.target.value;
            socket.emit('chat', msg);
            e.target.value = '';
        }
    });
    socket.on('chat', appendChat);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => {
        monsters.getChildren().forEach(mon => {
            if (Phaser.Math.Distance.Between(player.x, player.y, mon.x, mon.y) < 50) {
                socket.emit('attack', mon.monsterId);
            }
        });
    });
}

function addPlayer(self, p) {
    if (p.socketId === socket.id) {
        player = self.physics.add.image(p.x, p.y, 'player').setDisplaySize(50, 50).setCollideWorldBounds(true);
    } else {
        const op = self.physics.add.image(p.x, p.y, 'player').setDisplaySize(50, 50);
        op.playerId = p.socketId;
        otherPlayers.add(op);
    }
}

function addOtherPlayer(self, p) { addPlayer(self, p); }

function addMonster(self, m) {
    const mon = self.physics.add.image(m.x, m.y, 'monster').setDisplaySize(40, 40);
    mon.monsterId = m.id;
    mon.hp = m.hp;
    monsters.add(mon);
}

function update() {
    if (player) {
        let moved = false;
        if (this.cursors.left.isDown) { player.x -= 3; moved = true; }
        if (this.cursors.right.isDown) { player.x += 3; moved = true; }
        if (this.cursors.up.isDown) { player.y -= 3; moved = true; }
        if (this.cursors.down.isDown) { player.y += 3; moved = true; }
        if (moved) socket.emit('move', { x: player.x, y: player.y });
    }
}

function appendChat(msg) {
    const chat = document.getElementById('chat');
    const p = document.createElement('p');
    p.textContent = msg;
    p.style.color = 'white';
    p.style.margin = '2px';
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
}