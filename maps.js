module.exports = {
  starting_zone: {
    name: 'Starting Zone',
    width: 1000,
    height: 1000,
    description: 'The beginner-friendly zone.',
    neighbors: ['forest_zone'], // โซนที่เชื่อมต่อ
  },
  forest_zone: {
    name: 'Dark Forest',
    width: 1500,
    height: 1500,
    description: 'Dangerous forest with monsters.',
    neighbors: ['starting_zone', 'cave_zone'],
  },
  cave_zone: {
    name: 'Mysterious Cave',
    width: 800,
    height: 800,
    description: 'Dark caves full of treasures.',
    neighbors: ['forest_zone'],
  }
};
