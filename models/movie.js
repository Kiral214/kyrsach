const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Review = require('./review');

const Movie = sequelize.define('Movie', {

  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  genre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  releaseYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: DataTypes.STRING,
  actors: DataTypes.STRING,
  coverImage: DataTypes.STRING,
  productionYear: DataTypes.INTEGER,
  country: DataTypes.STRING,
  slogan: DataTypes.STRING,
  director: DataTypes.STRING,
  screenwriters: DataTypes.STRING,
  producers: DataTypes.STRING,
  operator: DataTypes.STRING,
  composer: DataTypes.STRING,
  artist: DataTypes.STRING,
  editor: DataTypes.STRING,
  budget: DataTypes.STRING,
  premiere: DataTypes.STRING,
  mpaaRating: DataTypes.STRING,
  duration: DataTypes.STRING,
});

// Movie has many Reviews
// Movie.hasMany(Review, { foreignKey: 'movieId', as: 'movieReviews' });
// Review.belongsTo(Movie, { foreignKey: 'movieId', as: 'movie' });

module.exports = Movie;
