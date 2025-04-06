/**
 * Enhanced configuration management for the REAL ID Appointment Tracker
 * 
 * Features:
 * - Environment variable validation
 * - Type coercion for numeric values
 * - Configuration validation with detailed error messages
 * - Default value handling
 * - Secure credential management
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Attempt to load environment variables from .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Get environment variable with type coercion and validation
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.required=false] - If true, throw error when not set
 * @param {string} [options.type] - Expected type (string, number, boolean, json)
 * @param {Function} [options.validate] - Validation function
 * @returns {*} The environment variable value
 */
function getEnv(key, defaultValue, options = {}) {
  const value = process.env[key];
  const { required = false, type, validate } = options;
  
  // Handle required fields
  if (required && value === undefined) {
    throw new Error(`Required configuration ${key} is missing`);
  }
  
  // Return default if value not set
  if (value === undefined) {
    return defaultValue;
  }
  
  let parsedValue = value;
  
  // Type coercion
  if (type) {
    try {
      switch (type.toLowerCase()) {
        case 'number':
          parsedValue = Number(value);
          if (isNaN(parsedValue)) throw new Error(`${key} must be a number`);
          break;
        case 'boolean':
          const normalized = value.toLowerCase().trim();
          if (['true', 'yes', '1', 'on'].includes(normalized)) {
            parsedValue = true;
          } else if (['false', 'no', '0', 'off'].includes(normalized)) {
            parsedValue = false;
          } else {
            throw new Error(`${key} must be a boolean`);
          }
          break;
        case 'json':
          parsedValue = JSON.parse(value);
          break;
        case 'string':
        default:
          parsedValue = String(value);
      }
    } catch (error) {
      throw new Error(`Invalid configuration value for ${key}: ${error.message}`);
    }
  }
  
  // Custom validation
  if (validate && typeof validate === 'function') {
    const validationResult = validate(parsedValue);
    if (validationResult !== true) {
      throw new Error(`Invalid configuration value for ${key}: ${validationResult || 'Validation failed'}`);
    }
  }
  
  return parsedValue;
}

/**
 * Obfuscate sensitive information for logging
 * @param {string} value - Value to obfuscate
 * @returns {string} Obfuscated value
 */
function obfuscate(value) {
  if (!value || typeof value !== 'string' || value.length < 4) {
    return '****';
  }
  
  // Show first 2 and last 2 characters, obfuscate the rest
  return `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
}

/**
 * Configuration Validation
 * Each entry contains:
 * - key: Environment variable key
 * - default: Default value
 * - required: Whether the value is required
 * - type: Expected type
 * - validate: Optional validation function
 * - sensitive: Whether to obfuscate in logs
 */
const CONFIG_SCHEMA = [
  {
    key: 'TRACKER_REGULAR_URL',
    default: 'https://telegov.njportal.com/njmvc/AppointmentWizard',
    required: true,
    type: 'string',
    validate: (url) => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return 'Invalid URL format';
      }
    }
  },
  {
    key: 'TRACKER_MOBILE_URL',
    default: 'https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard',
    required: true,
    type: 'string',
    validate: (url) => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return 'Invalid URL format';
      }
    }
  },
  {
    key: 'TRACKER_REGULAR_NOTIFICATION_URL',
    default: 'https://telegov.njportal.com/njmvc/AppointmentWizard/12',
    required: false,
    type: 'string',
    validate: (url) => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return 'Invalid URL format';
      }
    }
  },
  {
    key: 'TRACKER_MOBILE_NOTIFICATION_URL',
    default: 'https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard',
    required: false,
    type: 'string',
    validate: (url) => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return 'Invalid URL format';
      }
    }
  },
  {
    key: 'TRACKER_CHECK_INTERVAL',
    default: 10,
    required: false,
    type: 'number',
    validate: (interval) => interval > 0 || 'Interval must be greater than 0'
  },
  {
    key: 'TRACKER_EMAIL_SENDER',
    default: '',
    required: false,
    type: 'string',
    validate: (email) => {
      let emailToCheck = email;
      
      // Check if the email is in the format "Name <email@example.com>"
      if (email.includes('<') && email.includes('>')) {
        const matches = email.match(/<([^>]+)>/);
        if (matches && matches[1]) {
          emailToCheck = matches[1];
        }
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(emailToCheck) || 'Invalid email format';
    }
  },
  {
    key: 'TRACKER_EMAIL_RECIPIENT',
    default: '',
    required: false,
    type: 'string'
  },
  {
    key: 'TRACKER_EMAIL_PASSWORD',
    default: '',
    required: false,
    type: 'string',
    sensitive: true
  },
  {
    key: 'TRACKER_EMAIL_SUBJECT',
    default: 'REAL ID Appointment Available!',
    required: false,
    type: 'string'
  },
  {
    key: 'TRACKER_LOG_FILE',
    default: 'tracker.log',
    required: false,
    type: 'string'
  },
  {
    key: 'TRACKER_LOG_LEVEL',
    default: 'info',
    required: false,
    type: 'string',
    validate: (level) => ['debug', 'info', 'warn', 'error', 'fatal'].includes(level.toLowerCase()) || 
      'Log level must be one of: debug, info, warn, error, fatal'
  },
  {
    key: 'TRACKER_REQUEST_TIMEOUT',
    default: 30000,
    required: false,
    type: 'number',
    validate: (timeout) => timeout > 0 || 'Timeout must be greater than 0'
  },
  {
    key: 'TRACKER_MAX_RETRIES',
    default: 3,
    required: false,
    type: 'number',
    validate: (retries) => retries >= 0 || 'Retries must be greater than or equal to 0'
  },
  {
    key: 'TRACKER_USER_AGENT',
    default: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    required: false,
    type: 'string'
  }
];

class Config {
  constructor() {
    this.values = {};
    this.loadConfig();
  }
  
  /**
   * Load and validate all configuration values
   */
  loadConfig() {
    const errors = [];
    
    CONFIG_SCHEMA.forEach(({ key, default: defaultValue, required, type, validate, sensitive }) => {
      try {
        this.values[key] = getEnv(key, defaultValue, { required, type, validate });
      } catch (error) {
        errors.push(error.message);
      }
    });
    
    if (errors.length > 0) {
      console.error('Configuration errors:');
      errors.forEach(error => console.error(`- ${error}`));
      throw new Error(`Invalid configuration: ${errors.length} error(s) found`);
    }
  }
  
  /**
   * Get a configuration value
   * @param {string} key - Configuration key
   * @returns {*} The configuration value
   */
  get(key) {
    return this.values[key];
  }
  
  /**
   * Export configuration in a structure optimized for the application
   * @returns {Object} Structured configuration object
   */
  export() {
    return {
      // URLs to check for appointments
      urls: {
        regular: this.get('TRACKER_REGULAR_URL'),
        mobile: this.get('TRACKER_MOBILE_URL')
      },
      
      // URLs to send in notifications
      notificationUrls: {
        regular: this.get('TRACKER_REGULAR_NOTIFICATION_URL'),
        mobile: this.get('TRACKER_MOBILE_NOTIFICATION_URL')
      },
      
      // Check interval in minutes
      checkIntervalMinutes: this.get('TRACKER_CHECK_INTERVAL'),
      
      // Email configuration
      email: {
        sender: this.get('TRACKER_EMAIL_SENDER'),
        recipient: this.get('TRACKER_EMAIL_RECIPIENT'),
        password: this.get('TRACKER_EMAIL_PASSWORD'),
        subject: this.get('TRACKER_EMAIL_SUBJECT'),
      },
      
      // Logging
      logging: {
        file: this.get('TRACKER_LOG_FILE'),
        level: this.get('TRACKER_LOG_LEVEL')
      },
      
      // HTTP request config
      http: {
        timeout: this.get('TRACKER_REQUEST_TIMEOUT'),
        maxRetries: this.get('TRACKER_MAX_RETRIES'),
        userAgent: this.get('TRACKER_USER_AGENT')
      }
    };
  }
  
  /**
   * Get a safe-to-log version of the configuration (sensitive values obfuscated)
   * @returns {Object} Safe configuration object
   */
  getSafeConfig() {
    const safeConfig = {};
    
    CONFIG_SCHEMA.forEach(({ key, sensitive }) => {
      if (sensitive && this.values[key]) {
        safeConfig[key] = obfuscate(this.values[key]);
      } else {
        safeConfig[key] = this.values[key];
      }
    });
    
    return safeConfig;
  }
  
  /**
   * Validate that the configuration has required email settings for notifications
   * @returns {boolean} True if configuration has required email settings
   */
  hasValidEmailSettings() {
    return (
      this.get('TRACKER_EMAIL_SENDER') &&
      this.get('TRACKER_EMAIL_RECIPIENT') &&
      this.get('TRACKER_EMAIL_PASSWORD')
    );
  }
}

// Create and export a singleton instance
const config = new Config();

module.exports = {
  config,
  getEnv
};
