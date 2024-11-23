// const Movie = require('./models/movie');
// const Review = require('./models/review');
const { Sequelize } = require('sequelize');
require('dotenv').config();  // Подключение переменных окружения из файла .env
console.log(2)
// (async () => {
//   try {
//     await sequelize.sync({ force: false });
//     console.log('Database synchronized');
//   } catch (error) {
//     console.error('Error synchronizing database:', error.message);
//   }
// })();

// Создаем экземпляр Sequelize с использованием строки подключения из переменной окружения
const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: 'postgres',
  logging: false,  // Можно отключить логирование SQL-запросов
});

// Экспортируем подключение
module.exports = sequelize;
