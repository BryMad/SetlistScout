const winston = require('winston');

const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure the logger
const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    // File logging only in development for troubleshooting
    ...(NODE_ENV === 'development' ? [
      new winston.transports.File({
        filename: 'server.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),
      new winston.transports.File({
        filename: 'error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    ] : [])
  ],
});

logger.info(`Logger initialized in ${NODE_ENV} mode`);

module.exports = logger;