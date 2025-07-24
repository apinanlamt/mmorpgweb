const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  username: String,
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  hp: { type: Number, default: 100 },
  maxHp: { type: Number, default: 100 },

  // ตำแหน่งในแผนที่ + โซน
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  zone: { type: String, default: 'starting_zone' },

  equipment: {
    weaponUpgradeLevel: { type: Number, default: 0 },
    armorUpgradeLevel: { type: Number, default: 0 }
  },

  inventory: [{
    itemId: String,
    count: Number
  }],

  quests: [{
    questId: String,
    status: String, // 'active', 'completed'
    progress: { type: Number, default: 0 }
  }]
});

// ฟังก์ชันอัปเกรดอุปกรณ์
PlayerSchema.methods.upgradeEquipment = async function(type) {
  if (type === 'weapon') {
    this.equipment.weaponUpgradeLevel++;
  } else if (type === 'armor') {
    this.equipment.armorUpgradeLevel++;
  }
  await this.save();
};

module.exports = mongoose.model('Player', PlayerSchema);
