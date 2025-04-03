/**
 * Test script for the REAL ID Appointment Tracker
 * This script runs a single check without scheduling
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Ensure log file exists
const logFilePath = path.join(__dirname, '..', config.logFile);
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, '');
}

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
    logFilePath,
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
        log(`Regular site count text: "${countText}"`);
        const match = countText.match(/(\d+)/);
        if (match) {
          count = parseInt(match[0], 10);
        } else {
          log(`Failed to parse count from text: "${countText}"`);
        }
      }
    });
  } else if (type === 'mobile') {
    // Find the REAL ID - MOBILE section
    $('span.text-black.text-uppercase.cardButtonTitle').each((i, el) => {
      const title = $(el).text().trim();
      if (title === 'REAL ID - MOBILE') {
        // Get the count from the next span with class cardButtonCount
        const countText = $(el).parent().find('span.text-black.cardButtonCount').text().trim();
        log(`Mobile site count text: "${countText}"`);
        const match = countText.match(/(\d+)/);
        if (match) {
          count = parseInt(match[0], 10);
        } else {
          log(`Failed to parse count from text: "${countText}"`);
        }
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
 * Run a test check on both websites
 */
async function runTest() {
  log('Starting test appointment check...');
  
  // Check regular site
  const regularCount = await checkAppointments('regular');
  log(`Regular site REAL ID appointment count: ${regularCount}`);
  
  // Check mobile site
  const mobileCount = await checkAppointments('mobile');
  log(`Mobile site REAL ID appointment count: ${mobileCount}`);
  
  log('Test check completed');
}

// Run the test
runTest();
