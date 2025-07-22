const fs = require('fs');
const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (isDevelopment && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, `dev-${new Date().toISOString().split('T')[0]}.log`);

/**
 * Development logger that only logs in development mode
 * Logs to both console and file for easy debugging
 */
class DevLogger {
  constructor() {
    this.enabled = isDevelopment;
  }

  /**
   * Log a message with optional data
   * @param {string} category - Log category (e.g., 'deezer', 'musicbrainz', 'setlist')
   * @param {string} message - Log message
   * @param {*} data - Optional data to log
   */
  log(category, message, data = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      category,
      message,
      ...(data && { data })
    };

    // Console log with color coding
    const color = this.getCategoryColor(category);
    console.log(`${color}[${timestamp}] [${category.toUpperCase()}] ${message}\x1b[0m`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // File log
    try {
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Log an error
   * @param {string} category - Log category
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  error(category, message, error) {
    if (!this.enabled) return;

    const errorData = {
      message: error.message,
      stack: error.stack,
      ...(error.response && {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      })
    };

    this.log(category, `ERROR: ${message}`, errorData);
  }

  /**
   * Get color code for category
   * @param {string} category 
   * @returns {string} ANSI color code
   */
  getCategoryColor(category) {
    const colors = {
      'deezer': '\x1b[36m',      // Cyan
      'musicbrainz': '\x1b[35m',  // Magenta
      'setlist': '\x1b[33m',      // Yellow
      'spotify': '\x1b[32m',      // Green
      'cache': '\x1b[34m',        // Blue
      'sse': '\x1b[37m',          // White
      'error': '\x1b[31m'         // Red
    };
    return colors[category.toLowerCase()] || '\x1b[37m';
  }

  /**
   * Clear old log files (older than 7 days)
   */
  cleanOldLogs() {
    if (!this.enabled) return;

    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    try {
      const files = fs.readdirSync(logsDir);
      files.forEach(file => {
        if (file.startsWith('dev-') && file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs < oneWeekAgo) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error('Failed to clean old logs:', error.message);
    }
  }
}

// Create singleton instance
const devLogger = new DevLogger();

// Clean old logs on startup
devLogger.cleanOldLogs();

module.exports = devLogger;