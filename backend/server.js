// File: ./backend/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import the AdminAuthService
const AdminAuthService = require('./utils/adminAuth');

const app = express();
const port = process.env.PORT || 3000;

// Create Redis client with improved connection handling
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 60000, // 60 seconds
    keepAlive: 30000, // Send keep-alive every 30 seconds
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Too many retries on Redis. Giving up.');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000); // increasing delay, capped at 3s
    }
  }
});

// Set up Redis event listeners for connection management
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
  if (err.code === 'ECONNRESET' || err.code === 'CONNECTION_BROKEN') {
    console.log('Connection reset detected - Redis will automatically attempt to reconnect');
  }
});

redisClient.on('reconnecting', () => {
  console.log('Attempting to reconnect to Redis...');
});

redisClient.on('connect', () => {
  console.log('Connected/Reconnected to Redis');
});

// Connect to Redis
redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

// Initialize AdminAuthService with the Redis client
// This should be done after the Redis client is connected
const adminAuth = new AdminAuthService(redisClient);

// Make adminAuth available to routes through app locals
app.locals.adminAuth = adminAuth;

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
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Handle preflight OPTIONS requests for all routes.
app.options('*', cors());

// Initialize RedisStore
const store = new RedisStore({ client: redisClient });

// Session Middleware
app.use(session({
  store: store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Must be true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Important for cross-site cookies
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
    // No domain setting since frontend and backend are on different domains
  },
}));

// Keep Redis connection alive with periodic pings
const REDIS_PING_INTERVAL = 30000; // 30 seconds
setInterval(async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.ping();
      // Uncomment for debugging:
      // console.log('Redis ping successful');
    }
  } catch (error) {
    console.error('Redis ping failed:', error);
  }
}, REDIS_PING_INTERVAL);

// Route Imports
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const setlistRoutes = require('./routes/setlistRoutes');
const sseRoutes = require('./routes/sseRoutes');
// Import the admin routes
const adminRoutes = require('./routes/adminRoutes');

// Mount all route handlers
app.use('/auth', authRoutes);
app.use('/playlist', playlistRoutes);
app.use('/setlist', setlistRoutes);
app.use('/sse', sseRoutes);
// Mount the admin routes
app.use('/admin', adminRoutes);

// Log check for admin setup on startup
adminAuth.isSetup()
  .then(isSetup => {
    console.log(`Admin Spotify account setup status: ${isSetup ? 'Configured' : 'Not configured'}`);
    if (!isSetup) {
      console.log('Visit /admin-setup in your browser to configure the admin Spotify account');
    }
  })
  .catch(err => {
    console.error('Error checking admin setup:', err);
  });

// Static file serving
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-all route for SPA
app.get('*', (req, res) => {
  console.log('Serving the frontend application');
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});