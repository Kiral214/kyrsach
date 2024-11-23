const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Review = require('./review');

const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
        type: DataTypes.ENUM('user', 'admin'), // Ограничиваем роли только двумя значениями
        allowNull: false,
        defaultValue: 'user', // Роль по умолчанию - обычный пользователь
    },
});

// Связь с отзывами
//User.hasMany(Review, { foreignKey: 'userId', as: 'userReviews' });
//Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = User;
