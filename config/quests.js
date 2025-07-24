// config/quests.js
module.exports = [
  {
    questId: "quest1",
    name: "ฆ่ามอนสเตอร์ 5 ตัว",
    type: "killMonster",
    targetMonsterName: "Goblin",
    amount: 5,
    rewardExp: 100,
    rewardItem: { itemId: "potion", count: 1 }
  },
  {
    questId: "quest2",
    name: "เก็บไอเท็ม 3 ชิ้น",
    type: "collectItem",
    targetItemId: "potion",
    amount: 3,
    rewardExp: 50,
    rewardItem: { itemId: "sword", count: 1 }
  }
];
