const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const sequelize = require('./db');       // Подключение к базе данных
const Movie = require('./models/movie'); // Импорт модели
const Review = require('./models/review'); // Импорт модели Review
const User = require('./models/user');
const movieController = require('./movieController');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_secret_key';

console.log(1)

User.hasMany(Review, { foreignKey: 'userId', as: 'userReviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Movie.hasMany(Review, { foreignKey: 'movieId', as: 'movieReviews' });
Review.belongsTo(Movie, { foreignKey: 'movieId', as: 'movie' });

app.use(cookieParser());
app.use(express.json());  // Для обработки JSON в теле запросов
app.use(cors({
  origin: 'http://localhost:5173', // Укажите ваш фронтенд URL
  credentials: true,              // Включаем поддержку cookie
}));

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
  const token = req.cookies?.token; // Чтение токена из cookie
  if (!token) {
    return res.status(401).json({ message: 'Access token is missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Добавляем информацию о пользователе в запрос
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

// Регистрация пользователя
app.post('/register', authenticateToken, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Проверка на наличие текущего пользователя (защита маршрута)
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверка роли текущего пользователя (только администратор может задавать роли)
    if (req.user.role !== 'admin' && role && role !== 'user') {
      return res.status(403).json({ message: 'Only admins can assign roles' });
    }

    // Проверка существующего пользователя
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Валидация входных данных
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание нового пользователя
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: role || 'user', // Устанавливаем роль по умолчанию
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { username: newUser.username, role: newUser.role },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};

// Авторизация пользователя
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Генерация JWT
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    // Установка токена в cookie
    res.cookie('token', token, {
      httpOnly: true, // Предотвращает доступ к cookie из JavaScript
      secure: false,  // Установите true, если используете HTTPS
      maxAge: 3600000, // 1 час
      sameSite: 'lax', // Важно для кросс-доменных запросов (можно попробовать 'none' при использовании HTTPS)
    });


    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Logout (удаление токена)
app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logout successful' });
});





// Пример защищённого маршрута
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Добавление отзыва к фильму (доступ только для авторизованных пользователей)
app.post('/movies/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; // ID фильма
    const { comment, rating } = req.body;

    // Проверка существования фильма
    const movie = await Movie.findByPk(id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Создание отзыва
    const review = await Review.create({
      movieId: id,
      comment,
      rating,
      userId: req.user.id, // ID пользователя из токена
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error adding review', error: error.message });
  }
});

// Новый маршрут для получения средней оценки фильма
app.get('/movies/:movieId/average-rating', async (req, res) => {
  try {
    const { movieId } = req.params;
    const reviews = await Review.findAll({ where: { movieId } });

    if (!reviews.length) {
      return res.json({ movieId, averageRating: 0, message: 'Нет отзывов.' });
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / reviews.length).toFixed(2);

    res.json({ movieId, averageRating });
  } catch (error) {
    console.error('Error fetching average rating:', error);
    res.status(500).json({ message: 'Ошибка при вычислении средней оценки', error: error.message });
  }
});

// Получение всех отзывов для фильма
app.get('/movies/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;

    // Используем правильный алиас 'movieReviews'
    const movie = await Movie.findByPk(id, {
      include: [{ model: Review, as: 'movieReviews', attributes: ['id', 'comment', 'rating', 'createdAt'] }],
    });

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.status(200).json({
      movie: {
        id: movie.id,
        title: movie.title,
        description: movie.description,
      },
      reviews: movie.movieReviews,
    });
  } catch (error) {
    console.error('Error fetching movie and reviews:', error);
    res.status(500).json({ message: 'Error fetching movie and reviews', error: error.message });
  }
});

app.get('/current-user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'username', 'role'] });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Error fetching user data', error: error.message });
  }
});



// Удаление отзыва
app.delete('/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Найти отзыв по ID
    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Проверить права доступа: администратор или владелец отзыва
    if (req.user.role !== 'admin' && review.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    await review.destroy();
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
});


// GET-запрос для получения данных о фильме и его отзывах
app.get('/movies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Получаем фильм по его ID с отзывами
    const movie = await Movie.findByPk(id, {
      include: [{
        model: Review,
        as: 'movieReviews',
        attributes: ['id', 'rating', 'comment', 'createdAt', 'userId'], // Добавьте 'comment'
      }],
    });

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const reviews = movie.movieReviews.map(review => ({
      id: review.id,
      comment: review.comment, // Убедитесь, что 'comment' передается
      rating: review.rating,
      createdAt: review.createdAt, // Убедитесь, что поле 'createdAt' добавлено
    }));

    // Добавьте отзывы в общий объект ответа
    res.json({
      movie: {
        id: movie.id,
        title: movie.title,
        genre: movie.genre,
        releaseYear: movie.releaseYear,
        description: movie.description,
        actors: movie.actors,
        coverImage: movie.coverImage,
        averageRating: reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : 'Нет отзывов',
      },
      reviews: movie.movieReviews, // Отправляем отзывы с userId,
    });
  } catch (error) {
    console.error('Error fetching movie data:', error);
    res.status(500).json({ message: 'Error fetching movie data', error: error.message });
  }
});



// POST-запрос для добавления нового фильма
app.post('/movies', async (req, res) => {
  try {
    const {
      title,
      genre,
      releaseYear,
      description,
      actors,
      coverImage,
      productionYear,
      country,
      slogan,
      director,
      screenwriters,
      producers,
      operator,
      composer,
      artist,
      editor,
      budget,
      premiere,
      mpaaRating,
      duration
    } = req.body;

    // Проверка на наличие обязательных данных
    if (!title || !genre || !releaseYear) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newMovie = await Movie.create({
      title,
      genre,
      releaseYear,
      description,
      actors,
      coverImage,
      productionYear,
      country,
      slogan,
      director,
      screenwriters,
      producers,
      operator,
      composer,
      artist,
      editor,
      budget,
      premiere,
      mpaaRating,
      duration
    });

    res.status(201).json(newMovie);
  } catch (error) {
    console.error('Error creating movie:', error);
    res.status(500).json({ message: 'Error creating movie', error: error.message });
  }
});

app.put('/movies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      genre,
      releaseYear,
      description,
      actors,
      coverImage,
      productionYear,
      country,
      slogan,
      director,
      screenwriters,
      producers,
      operator,
      composer,
      artist,
      editor,
      budget,
      premiere,
      mpaaRating,
      duration
    } = req.body;

    const movie = await Movie.findByPk(id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    await movie.update({
      title,
      genre,
      releaseYear,
      description,
      actors,
      coverImage,
      productionYear,
      country,
      slogan,
      director,
      screenwriters,
      producers,
      operator,
      composer,
      artist,
      editor,
      budget,
      premiere,
      mpaaRating,
      duration
    });

    res.status(200).json(movie);
  } catch (error) {
    console.error('Error updating movie:', error);
    res.status(500).json({ message: 'Error updating movie', error: error.message });
  }
});



// Маршрут для получения всех фильмов
app.get('/movies', async (req, res) => {
  try {
    const movies = await Movie.findAll();
    res.status(200).json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error); // Логируем ошибку
    res.status(500).json({ message: 'Error fetching movies', error: error.message });
  }
});

// Маршрут для удаления фильма по id
app.delete('/movies/:id', authenticateToken, async (req, res) => {
  try {
    const movieId = req.params.id;

    // Проверить, является ли пользователь администратором
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete movies' });
    }

    const movie = await Movie.findByPk(movieId);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    await movie.destroy();
    res.status(200).json({ message: 'Movie deleted successfully' });
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ message: 'Error deleting movie', error: error.message });
  }
});


// Синхронизация моделей и запуск сервера

async function startServer() {

  try {

    await sequelize.authenticate();  // Проверка подключения
    await sequelize.sync({ force: false });  // Создание таблиц, если их нет
    console.log('Database synchronized');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to sync database:', error);
  }
}

startServer();