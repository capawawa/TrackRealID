/**
 * Enhanced logging utility for the REAL ID Appointment Tracker
 * 
 * Features:
 * - Structured logging with severity levels
 * - Console and file output
 * - Timestamp formatting
 * - Log rotation support
 * - Context-rich logging with correlation IDs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Log levels with corresponding numerical values for filtering
const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50
};

// ANSI color codes for terminal output
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m'
};

class Logger {
  constructor(options = {}) {
    this.logFilePath = options.logFilePath || path.join(process.cwd(), 'tracker.log');
    this.minLevel = options.minLevel || LOG_LEVELS.INFO;
    this.useColors = options.useColors !== undefined ? options.useColors : true;
    this.logToConsole = options.logToConsole !== undefined ? options.logToConsole : true;
    this.logToFile = options.logToFile !== undefined ? options.logToFile : true;
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB default
    this.correlationId = options.correlationId || this._generateCorrelationId();
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Ensure log file exists
    if (this.logToFile && !fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, '');
    }
    
    // Check if log rotation is needed
    this._checkLogRotation();
  }
  
  /**
   * Generate a unique correlation ID for this logger instance
   * @private
   * @returns {string} A unique correlation ID
   */
  _generateCorrelationId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${timestamp}-${random}`;
  }
  
  /**
   * Check if log rotation is needed and rotate if necessary
   * @private
   */
  _checkLogRotation() {
    if (!this.logToFile) return;
    
    try {
      const stats = fs.statSync(this.logFilePath);
      if (stats.size >= this.maxLogSize) {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${this.logFilePath}.${timestamp}`;
        
        fs.renameSync(this.logFilePath, rotatedPath);
        fs.writeFileSync(this.logFilePath, '');
        this.info(`Log rotated. Previous log saved to ${rotatedPath}`);
      }
    } catch (error) {
      // If we can't rotate logs, just continue - don't crash the app
      console.error(`Error rotating logs: ${error.message}`);
    }
  }
  
  /**
   * Format a log message with timestamp, level, and other metadata
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   * @returns {string} Formatted log message
   */
  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    let prefix = '';
    
    // Add prefix based on log level
    switch (level) {
      case 'DEBUG':
        prefix = '[DEBUG]';
        break;
      case 'WARN':
        prefix = '[WARNING]';
        break;
      case 'ERROR':
        prefix = '[ERROR]';
        break;
      case 'FATAL':
        prefix = '[FATAL]';
        break;
      default:
        prefix = '[INFO]';
    }
    
    const correlationInfo = meta.correlationId || this.correlationId;
    const context = meta.context ? ` [${meta.context}]` : '';
    const metaStr = Object.keys(meta).length > 0 ? 
      ` ${JSON.stringify(Object.assign({}, meta, {correlationId: undefined, context: undefined}))}` : '';
    
    return `[${timestamp}] ${prefix}${context} [${correlationInfo}] ${message}${metaStr}`;
  }
  
  /**
   * Apply ANSI color to a log message based on level
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @returns {string} Colored log message
   */
  _colorize(level, message) {
    if (!this.useColors) return message;
    
    switch (level) {
      case 'DEBUG':
        return `${COLORS.GRAY}${message}${COLORS.RESET}`;
      case 'WARN':
        return `${COLORS.YELLOW}${message}${COLORS.RESET}`;
      case 'ERROR':
        return `${COLORS.RED}${message}${COLORS.RESET}`;
      case 'FATAL':
        return `${COLORS.RED}${message}${COLORS.RESET}`;
      default:
        return `${COLORS.GREEN}${message}${COLORS.RESET}`;
    }
  }
  
  /**
   * Write a log message to the configured outputs
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  _log(level, message, meta = {}) {
    const logLevel = LOG_LEVELS[level];
    
    // Skip if below minimum log level
    if (logLevel < this.minLevel) return;
    
    const formattedMessage = this._formatMessage(level, message, meta);
    
    // Log to console
    if (this.logToConsole) {
      const coloredMessage = this._colorize(level, formattedMessage);
      console.log(coloredMessage);
    }
    
    // Log to file
    if (this.logToFile) {
      try {
        fs.appendFileSync(this.logFilePath, formattedMessage + os.EOL);
      } catch (error) {
        console.error(`Error writing to log file: ${error.message}`);
      }
    }
  }
  
  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  debug(message, meta = {}) {
    this._log('DEBUG', message, meta);
  }
  
  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  info(message, meta = {}) {
    this._log('INFO', message, meta);
  }
  
  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  warn(message, meta = {}) {
    this._log('WARN', message, meta);
  }
  
  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  error(message, meta = {}) {
    if (meta.error instanceof Error) {
      meta.stack = meta.error.stack;
      meta.name = meta.error.name;
    }
    this._log('ERROR', message, meta);
  }
  
  /**
   * Log a fatal message
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  fatal(message, meta = {}) {
    this._log('FATAL', message, meta);
  }
  
  /**
   * Create a child logger with inherited settings and specified context
   * @param {string} context - Context name for the child logger
   * @param {Object} [meta={}] - Additional default metadata for the child logger
   * @returns {Logger} A new logger instance with the specified context
   */
  child(context, meta = {}) {
    const childLogger = new Logger({
      logFilePath: this.logFilePath,
      minLevel: this.minLevel,
      useColors: this.useColors,
      logToConsole: this.logToConsole,
      logToFile: this.logToFile,
      maxLogSize: this.maxLogSize,
      correlationId: this.correlationId
    });
    
    childLogger.context = context;
    childLogger.defaultMeta = meta;
    
    return childLogger;
  }
  
  /**
   * Set minimum log level
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR, FATAL)
   */
  setLevel(level) {
    if (LOG_LEVELS[level]) {
      this.minLevel = LOG_LEVELS[level];
    } else {
      this.warn(`Invalid log level: ${level}. Using INFO.`);
      this.minLevel = LOG_LEVELS.INFO;
    }
  }
}

// Create default logger instance
const defaultLogger = new Logger();

module.exports = {
  Logger,
  defaultLogger,
  LOG_LEVELS,
  
  // Export convenience methods on the default logger
  debug: (message, meta = {}) => defaultLogger.debug(message, meta),
  info: (message, meta = {}) => defaultLogger.info(message, meta),
  warn: (message, meta = {}) => defaultLogger.warn(message, meta),
  error: (message, meta = {}) => defaultLogger.error(message, meta),
  fatal: (message, meta = {}) => defaultLogger.fatal(message, meta),
  child: (context, meta = {}) => defaultLogger.child(context, meta),
  setLevel: (level) => defaultLogger.setLevel(level)
};
