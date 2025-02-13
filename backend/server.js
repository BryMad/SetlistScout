require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { RedisStore } = require('connect-redis'); // Updated import
const { createClient } = require('redis');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

// Set trust proxy
app.set('trust proxy', 1);

// Middleware Configuration
app.use(morgan('combined'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
}));
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://setlistscout.onrender.com'],
  credentials: true,
}));

// Initialize RedisStore
const store = new RedisStore({ client: redisClient }); // Updated initialization

// Session Middleware
app.use(session({
  store: store, // Updated usage
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));

// Route Imports
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const setlistRoutes = require('./routes/setlistRoutes');

app.use('/auth', authRoutes);
app.use('/playlist', playlistRoutes);
app.use('/setlist', setlistRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the Spotify Setlist App!');
});

app.get('/set-session', (req, res) => {
  req.session.testValue = 'Hello, Redis!';
  res.send('Session value set.');
});

app.get('/get-session', (req, res) => {
  res.send(`Session value: ${req.session.testValue}`);
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
