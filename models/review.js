const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./user');
const Movie = require('./movie');

const Review = sequelize.define('Review', {
  rating: { type: DataTypes.INTEGER, allowNull: false },
  comment: { type: DataTypes.TEXT, allowNull: false },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  movieId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Movies', key: 'id' },
  },
});

// Associations are defined in `user.js` and `movie.js`

module.exports = Review;