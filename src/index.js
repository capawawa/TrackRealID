const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
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

/**
 * Log a message to both console and log file
 * @param {string} message - The message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(
    path.join(__dirname, '..', config.logFile),
    logMessage + '\n',
    { flag: 'a' }
  );
}

/**
 * Extract the appointment count from the HTML
 * @param {string} html - The HTML content
 * @param {string} type - 'regular' or 'mobile'
 * @returns {number} - The appointment count
 */
function extractAppointmentCount(html, type) {
  const $ = cheerio.load(html);
  let count = 0;
  
  // Different selectors based on type
  if (type === 'regular') {
    // Find the REAL ID section
    $('span.text-black.text-uppercase.cardButtonTitle').each((i, el) => {
      const title = $(el).text().trim();
      if (title === 'REAL ID') {
        // Get the count from the next span with class cardButtonCount
        const countText = $(el).parent().find('span.text-black.cardButtonCount').text().trim();
        count = parseInt(countText.match(/(\d+)/)[0], 10);
      }
    });
  } else if (type === 'mobile') {
    // Find the REAL ID - MOBILE section
    $('span.text-black.text-uppercase.cardButtonTitle').each((i, el) => {
      const title = $(el).text().trim();
      if (title === 'REAL ID - MOBILE') {
        // Get the count from the next span with class cardButtonCount
        const countText = $(el).parent().find('span.text-black.cardButtonCount').text().trim();
        count = parseInt(countText.match(/(\d+)/)[0], 10);
      }
    });
  }
  
  return count;
}

/**
 * Check a website for REAL ID appointments
 * @param {string} type - 'regular' or 'mobile'
 * @returns {Promise<number>} - The appointment count
 */
async function checkAppointments(type) {
  try {
    const url = config.urls[type];
    log(`Checking ${type} site: ${url}`);
    
    const response = await axios.get(url);
    const count = extractAppointmentCount(response.data, type);
    
    log(`${type} site has ${count} REAL ID appointments available`);
    return count;
  } catch (error) {
    log(`Error checking ${type} site: ${error.message}`);
    return -1; // Error code
  }
}

/**
 * Send an email notification
 * @param {string} type - 'regular' or 'mobile'
 * @param {number} count - The appointment count
 * @returns {Promise<void>}
 */
async function sendNotification(type, count) {
  // Only send if we have a password configured
  if (!config.email.password) {
    log('Email password not configured. Skipping notification.');
    return;
  }
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.sender,
        pass: config.email.password
      }
    });
    
    const siteName = type === 'regular' ? 'Regular DMV' : 'Mobile Unit';
    
    const mailOptions = {
      from: config.email.sender,
      to: config.email.recipient,
      subject: config.email.subject,
      text: `${config.urls[type]} - ${count} REAL ID appts at ${siteName}!`
    };
    
    await transporter.sendMail(mailOptions);
    log(`Notification sent for ${type} site`);
  } catch (error) {
    log(`Error sending notification: ${error.message}`);
  }
}

/**
 * Run a check on both websites
 */
async function runCheck() {
  log('Starting appointment check...');
  
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
}

/**
 * Initialize the tracker
 */
function init() {
  log('REAL ID Appointment Tracker starting...');
  log(`Checking every ${config.checkIntervalMinutes} minutes`);
  
  // Run an initial check
  runCheck();
  
  // Schedule regular checks
  const cronSchedule = `*/${config.checkIntervalMinutes} * * * *`;
  cron.schedule(cronSchedule, runCheck);
  
  log(`Tracker running. Check the log file (${config.logFile}) for updates.`);
}

// Start the tracker
init();
