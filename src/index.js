const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
// Load environment variables from .env file
require('dotenv').config();
const config = require('./config');

// Ensure log file exists
const logFilePath = path.join(__dirname, '..', config.logFile);
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, '');
}

// Store the last known appointment counts
let lastCounts = {
  regular: 0,
  mobile: 0
};

// Track consecutive failures for exponential backoff
let consecutiveFailures = {
  regular: 0,
  mobile: 0
};

// Maximum number of retries
const MAX_RETRIES = 3;

// Base delay for exponential backoff (in milliseconds)
const BASE_DELAY = 2000;

/**
 * Log a message to both console and log file
 * @param {string} message - The message to log
 * @param {string} [level='info'] - Log level (info, warn, error)
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  let prefix = '';
  
  // Add prefix based on log level
  switch (level) {
    case 'warn':
      prefix = '[WARNING] ';
      break;
    case 'error':
      prefix = '[ERROR] ';
      break;
    default:
      prefix = '[INFO] ';
  }
  
  const logMessage = `[${timestamp}] ${prefix}${message}`;
  
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(
    path.join(__dirname, '..', config.logFile),
    logMessage + '\n',
    { flag: 'a' }
  );
}

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - The current attempt number (0-based)
 * @returns {number} - Delay in milliseconds
 */
function calculateBackoff(attempt) {
  // Add some randomness to prevent thundering herd problem
  const jitter = Math.random() * 1000;
  return Math.min(
    BASE_DELAY * Math.pow(2, attempt) + jitter,
    60000 // Cap at 1 minute
  );
}

/**
 * Extract the appointment count from the HTML
 * @param {string} html - The HTML content
 * @param {string} type - 'regular' or 'mobile'
 * @returns {number} - The appointment count
 */
function extractAppointmentCount(html, type) {
  try {
    const $ = cheerio.load(html);
    let count = 0;
    let found = false;
    
    // Different selectors based on type
    if (type === 'regular') {
      // Find the REAL ID section
      $('span.text-black.text-uppercase.cardButtonTitle').each((i, el) => {
        const title = $(el).text().trim();
        if (title === 'REAL ID') {
          found = true;
          // Get the count from the next span with class cardButtonCount
          const countElement = $(el).parent().find('span.text-black.cardButtonCount');
          if (countElement.length) {
            const countText = countElement.text().trim();
            log(`Found count text for ${type}: "${countText}"`, 'info');
            
            const match = countText.match(/(\d+)/);
            if (match) {
              count = parseInt(match[0], 10);
            } else {
              log(`Failed to parse count from text: "${countText}"`, 'warn');
            }
          } else {
            log(`Count element not found for ${type} REAL ID section`, 'warn');
          }
        }
      });
    } else if (type === 'mobile') {
      // Find the REAL ID - MOBILE section
      $('span.text-black.text-uppercase.cardButtonTitle').each((i, el) => {
        const title = $(el).text().trim();
        if (title === 'REAL ID - MOBILE') {
          found = true;
          // Get the count from the next span with class cardButtonCount
          const countElement = $(el).parent().find('span.text-black.cardButtonCount');
          if (countElement.length) {
            const countText = countElement.text().trim();
            log(`Found count text for ${type}: "${countText}"`, 'info');
            
            const match = countText.match(/(\d+)/);
            if (match) {
              count = parseInt(match[0], 10);
            } else {
              log(`Failed to parse count from text: "${countText}"`, 'warn');
            }
          } else {
            log(`Count element not found for ${type} REAL ID section`, 'warn');
          }
        }
      });
    }
    
    if (!found) {
      log(`Could not find ${type === 'regular' ? 'REAL ID' : 'REAL ID - MOBILE'} section in HTML`, 'warn');
      // Save HTML for debugging if section not found
      const debugFilePath = path.join(__dirname, '..', `debug-${type}-${Date.now()}.html`);
      fs.writeFileSync(debugFilePath, html);
      log(`Saved HTML to ${debugFilePath} for debugging`, 'warn');
      return -1;
    }
    
    return count;
  } catch (error) {
    log(`Error parsing HTML for ${type}: ${error.message}`, 'error');
    return -1;
  }
}

/**
 * Check a website for REAL ID appointments with retries
 * @param {string} type - 'regular' or 'mobile'
 * @returns {Promise<number>} - The appointment count
 */
async function checkAppointments(type) {
  const url = config.urls[type];
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      if (retries > 0) {
        const delay = calculateBackoff(consecutiveFailures[type]);
        log(`Retry ${retries}/${MAX_RETRIES} for ${type} site after ${Math.round(delay / 1000)} seconds`, 'info');
        await sleep(delay);
      }
      
      log(`Checking ${type} site: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const count = extractAppointmentCount(response.data, type);
      
      if (count >= 0) {
        log(`${type} site has ${count} REAL ID appointments available`);
        // Reset consecutive failures on success
        consecutiveFailures[type] = 0;
        return count;
      } else {
        // Parsing error, try again
        log(`Failed to extract appointment count from ${type} site`, 'warn');
        retries++;
        consecutiveFailures[type]++;
      }
    } catch (error) {
      retries++;
      consecutiveFailures[type]++;
      
      // Provide more detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        log(`Error checking ${type} site: Status ${error.response.status} - ${error.message}`, 'error');
      } else if (error.request) {
        // The request was made but no response was received
        log(`Error checking ${type} site: No response received - ${error.message}`, 'error');
      } else {
        // Something happened in setting up the request that triggered an Error
        log(`Error checking ${type} site: ${error.message}`, 'error');
      }
      
      if (retries > MAX_RETRIES) {
        log(`Maximum retries (${MAX_RETRIES}) exceeded for ${type} site`, 'error');
        return -1;
      }
    }
  }
  
  return -1; // All retries failed
}

/**
 * Send an email notification with retry
 * @param {string} type - 'regular' or 'mobile'
 * @param {number} count - The appointment count
 * @returns {Promise<boolean>} - Whether the notification was sent successfully
 */
async function sendNotification(type, count) {
  // Only send if we have a password configured
  if (!config.email.password) {
    log('Email password not configured. Skipping notification.', 'warn');
    return false;
  }
  
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      if (retries > 0) {
        const delay = calculateBackoff(retries - 1);
        log(`Retry ${retries}/${MAX_RETRIES} for sending notification after ${Math.round(delay / 1000)} seconds`, 'info');
        await sleep(delay);
      }
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.email.sender,
          pass: config.email.password
        }
      });
      
      const siteName = type === 'regular' ? 'Regular DMV' : 'Mobile Unit';
      const notificationUrl = config.notificationUrls[type];
      
      const mailOptions = {
        from: config.email.sender,
        to: config.email.recipient,
        subject: config.email.subject,
        text: `${notificationUrl} - ${count} REAL ID appts at ${siteName}!`
      };
      
      await transporter.sendMail(mailOptions);
      log(`Notification sent for ${type} site`);
      return true;
    } catch (error) {
      retries++;
      log(`Error sending notification (attempt ${retries}): ${error.message}`, 'error');
      
      if (retries > MAX_RETRIES) {
        log(`Maximum retries (${MAX_RETRIES}) exceeded for sending notification`, 'error');
        return false;
      }
    }
  }
  
  return false;
}

/**
 * Run a check on both websites
 */
async function runCheck() {
  log('Starting appointment check...');
  
  try {
    // Check regular site
    const regularCount = await checkAppointments('regular');
    if (regularCount > 0 && lastCounts.regular === 0) {
      log(`ALERT: Regular site now has ${regularCount} appointments available!`);
      await sendNotification('regular', regularCount);
    }
    lastCounts.regular = regularCount >= 0 ? regularCount : lastCounts.regular;
    
    // Check mobile site
    const mobileCount = await checkAppointments('mobile');
    if (mobileCount > 0 && lastCounts.mobile === 0) {
      log(`ALERT: Mobile site now has ${mobileCount} appointments available!`);
      await sendNotification('mobile', mobileCount);
    }
    lastCounts.mobile = mobileCount >= 0 ? mobileCount : lastCounts.mobile;
    
    log('Check completed');
  } catch (error) {
    log(`Unexpected error during check: ${error.message}`, 'error');
    log(error.stack, 'error');
  }
}

/**
 * Validate configuration
 * @returns {boolean} - Whether the configuration is valid
 */
function validateConfig() {
  let isValid = true;
  
  // Check URLs
  if (!config.urls.regular) {
    log('Missing regular site URL in configuration', 'error');
    isValid = false;
  }
  
  if (!config.urls.mobile) {
    log('Missing mobile site URL in configuration', 'error');
    isValid = false;
  }
  
  // Check notification URLs
  if (!config.notificationUrls.regular) {
    log('Missing regular site notification URL in configuration', 'warn');
  }
  
  if (!config.notificationUrls.mobile) {
    log('Missing mobile site notification URL in configuration', 'warn');
  }
  
  // Check email configuration
  if (!config.email.sender) {
    log('Missing email sender in configuration', 'warn');
  }
  
  if (!config.email.recipient) {
    log('Missing email recipient in configuration', 'warn');
  }
  
  if (!config.email.password) {
    log('Missing email password in configuration', 'warn');
    log('Notifications will be disabled', 'warn');
  }
  
  // Check interval
  if (!config.checkIntervalMinutes || config.checkIntervalMinutes < 1) {
    log('Invalid check interval in configuration, using default of 30 minutes', 'warn');
    config.checkIntervalMinutes = 30;
  }
  
  return isValid;
}

/**
 * Initialize the tracker
 */
function init() {
  log('REAL ID Appointment Tracker starting...');
  
  // Validate configuration
  validateConfig();
  
  log(`Checking every ${config.checkIntervalMinutes} minutes`);
  
  // Run an initial check
  runCheck();
  
  // Schedule regular checks
  const cronSchedule = `*/${config.checkIntervalMinutes} * * * *`;
  cron.schedule(cronSchedule, runCheck);
  
  log(`Tracker running. Check the log file (${config.logFile}) for updates.`);
  
  // Handle process termination
  process.on('SIGINT', () => {
    log('Received SIGINT signal. Shutting down gracefully...', 'info');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('Received SIGTERM signal. Shutting down gracefully...', 'info');
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}`, 'error');
    log(error.stack, 'error');
    // Keep the process running despite the error
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled promise rejection: ${reason}`, 'error');
    // Keep the process running despite the error
  });
}

// Start the tracker
init();
