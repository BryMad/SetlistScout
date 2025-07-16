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
  ],
});

logger.info(`Logger initialized in ${NODE_ENV} mode`);

module.exports = logger;