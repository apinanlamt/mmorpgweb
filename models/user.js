const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  hash: String,
  salt: String,
  playerData: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
});

// สร้าง hash และ salt จาก password
UserSchema.methods.setPassword = async function(password) {
  this.salt = await bcrypt.genSalt(10);
  this.hash = await bcrypt.hash(password, this.salt);
};

// ตรวจสอบ password
UserSchema.methods.validatePassword = async function(password) {
  if (!this.hash) return false;
  return bcrypt.compare(password, this.hash);
};

module.exports = mongoose.model('User', UserSchema);
