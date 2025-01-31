let movies = [
    { id: 1, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan', releaseYear: 2010 },
    { id: 2, title: 'The Matrix', genre: 'Sci-Fi', director: 'The Wachowskis', releaseYear: 1999 },
    { id: 3, title: 'Interstellar', genre: 'Sci-Fi', director: 'Christopher Nolan', releaseYear: 2014 }
 ];
 
 // Получить все фильмы с фильтрацией и пагинацией
 
const express = require('express');
const router = express.Router();
const Movie = require('./models/movie'); // Убедитесь, что модель "Movie" подключена
const Sequelize = require('sequelize'); // Импорт Sequelize
// Получить все фильмы с фильтрацией, пагинацией и средним рейтингом
exports.getMovies = async (req, res) => {
   const { genre, year, page = 1, limit = 2 } = req.query;
   let filteredMovies = [...movies];

   // Фильтрация по жанру
   if (genre) {
       filteredMovies = filteredMovies.filter(movie => movie.genre.toLowerCase() === genre.toLowerCase());
   }

   // Фильтрация по году выпуска
   if (year) {
       filteredMovies = filteredMovies.filter(movie => movie.releaseYear === parseInt(year, 10));
   }

   // Пагинация
   const startIndex = (page - 1) * limit;
   const endIndex = page * limit;
   const paginatedMovies = filteredMovies.slice(startIndex, endIndex);

   try {
       // Добавление среднего рейтинга к каждому фильму
       const moviesWithRatings = await Promise.all(
           paginatedMovies.map(async (movie) => {
               const reviews = await Review.findAll({ where: { movieId: movie.id } });
               const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
               const averageRating = reviews.length ? (totalRating / reviews.length).toFixed(2) : 0;
               return { ...movie, averageRating };
           })
       );

       res.json({
           page: parseInt(page, 10),
           totalPages: Math.ceil(filteredMovies.length / limit),
           data: moviesWithRatings,
       });
   } catch (error) {
       console.error('Ошибка при получении средней оценки:', error);
       res.status(500).json({ message: 'Ошибка при обработке фильмов', error: error.message });
   }
};

exports.getMovieDetails = async (req, res) => {
   const { id } = req.params;

   try {
       const movie = movies.find(m => m.id === parseInt(id, 10));
       if (!movie) {
           return res.status(404).json({ message: 'Фильм не найден' });
       }

       const reviews = await Review.findAll({ where: { movieId: id } });
       const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
       const averageRating = reviews.length ? (totalRating / reviews.length).toFixed(2) : 0;

       res.json({ ...movie, averageRating });
   } catch (error) {
       console.error('Ошибка при получении деталей фильма:', error);
       res.status(500).json({ message: 'Ошибка при обработке деталей фильма', error });
   }
};


// Маршрут для поиска фильмов по названию
router.get('/search', async (req, res) => {
  try {
    const { title } = req.query;

    if (!title) {
      return res.status(400).json({ message: 'Параметр "title" обязателен' });
    }

    const movies = await Movie.findAll({
      where: {
        title: {
          [Sequelize.Op.iLike]: `%${title}%`, // PostgreSQL регистронезависимый поиск
        },
      },
    });

    res.json(movies);
  } catch (error) {
    console.error('Ошибка при поиске фильмов:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

  

  
  
  module.exports = router;

 // Добавить новый фильм
 exports.createMovie = (req, res) => {
    const { title, genre, director, releaseYear } = req.body;
    const newMovie = {
       id: movies.length + 1,
       title,
       genre,
       director,
       releaseYear
    };
    movies.push(newMovie);
    res.status(201).json(newMovie);
 };
 
 // Обновить информацию о фильме
 exports.updateMovie = (req, res) => {
    const { id } = req.params;
    const { title, genre, director, releaseYear } = req.body;
 
    const movie = movies.find(m => m.id === parseInt(id, 10));
    if (!movie) {
       return res.status(404).json({ message: "Movie not found" });
    }
 
    // Обновляем поля фильма
    movie.title = title || movie.title;
    movie.genre = genre || movie.genre;
    movie.director = director || movie.director;
    movie.releaseYear = releaseYear || movie.releaseYear;
 
    res.json(movie);
 };
 
 // Удалить фильм
 exports.deleteMovie = (req, res) => {
    const { id } = req.params;
    const movieIndex = movies.findIndex(m => m.id === parseInt(id, 10));
    
    if (movieIndex === -1) {
       return res.status(404).json({ message: "Movie not found" });
    }
    
    movies.splice(movieIndex, 1);
    res.json({ message: "Movie deleted" });
 };

 const Review = require('./models/review');

// Получить среднюю оценку для фильма
exports.getAverageRating = async (req, res) => {
    const { movieId } = req.params;

    try {
        // Извлечь все отзывы для фильма
        const reviews = await Review.findAll({ where: { movieId } });

        if (!reviews.length) {
            return res.json({ movieId, averageRating: 0, message: 'Нет отзывов.' });
        }

        // Вычислить среднюю оценку
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;

        res.json({ movieId, averageRating: averageRating.toFixed(2) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при вычислении средней оценки', error });
    }
};
