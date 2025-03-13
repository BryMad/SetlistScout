// File: ./frontend/src/api/index.js (updated)
export * from './authService';
export * from './setlistService';
export * from './playlistService';
export * from './sseService';

// Re-export the eventSourceService as default for easy import
import eventSourceService from './sseService';
export default eventSourceService;