const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: String,
  type: String, // e.g., "weapon", "armor", "consumable"
  baseAttack: Number,
  baseDefense: Number,
  price: Number
});

module.exports = mongoose.model('Item', ItemSchema);
