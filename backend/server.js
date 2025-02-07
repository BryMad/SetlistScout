require('dotenv').config(); // Load environment variables from .env


const express = require("express");
const session = require('express-session');
const cors = require("cors");
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Import Route Modules
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const setlistRoutes = require('./routes/setlistRoutes');

// Middleware Configuration

// Logging HTTP requests
app.use(morgan('combined'));

// TODO is this working? Rate Limiting 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Parse incoming JSON requests
app.use(express.json());

// Configure CORS
app.use(cors({
  origin: 'https://setlistscout.onrender.com',
  credentials: true,
}));

// TODO Configure Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET, // Use the session secret from .env
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' } // Secure cookies in production
}));

// Mount Routes
app.use('/auth', authRoutes);
app.use('/playlist', playlistRoutes);
app.use('/setlist', setlistRoutes);

// root route
app.get('/', (req, res) => {
  res.send('Welcome to the Spotify Setlist App!');
});

// Error Handling Middleware 
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
