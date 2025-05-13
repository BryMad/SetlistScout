// File: ./frontend/src/api/index.js
export * from './authService';
export * from './setlistService';
export * from './playlistService';
export * from './sseService';
export * from './deezerService';

// Re-export the eventSourceService as default for easy import
import eventSourceService from './sseService';
export default eventSourceService;