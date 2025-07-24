// monsterSystem.js
let monsters = [];
let monsterIdCounter = 1;

// ชนิดมอนสเตอร์หลายแบบ
const monsterTypes = [
  { name: 'Goblin', maxHp: 50, level: 1 },
  { name: 'Slime', maxHp: 30, level: 1 },
  { name: 'Wolf', maxHp: 70, level: 2 },
  { name: 'Orc', maxHp: 100, level: 3 },
];

// สุ่ม spawn มอนสเตอร์ใหม่
function spawnMonster() {
  const type = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
  const monster = {
    id: monsterIdCounter++,
    name: type.name,
    hp: type.maxHp,
    maxHp: type.maxHp,
    level: type.level,
    x: Math.floor(Math.random() * 500),
    y: Math.floor(Math.random() * 500),
  };
  monsters.push(monster);
  return monster;
}

// คืนมอนสเตอร์ทั้งหมด
function getMonsters() {
  return monsters;
}

// ทำ damage ให้มอนสเตอร์ ถ้าตายคืน true
function damageMonster(monsterId, damage) {
  const monster = monsters.find(m => m.id === monsterId);
  if (!monster) return false;

  monster.hp -= damage;
  if (monster.hp <= 0) {
    monsters = monsters.filter(m => m.id !== monsterId);
    return true;
  }
  return false;
}

module.exports = {
  spawnMonster,
  getMonsters,
  damageMonster,
};
