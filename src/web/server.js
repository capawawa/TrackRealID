/**
 * REAL ID Appointment Tracker Web Interface
 * 
 * This file creates a web server that provides a GUI for the tracker application.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { config } = require('../utils/config');
const App = require('../app');
const logger = require('../utils/logger');

// Create Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Create app instance for tracker
const trackerApp = new App();
let trackerRunning = false;
let logBuffer = [];
const MAX_LOG_ENTRIES = 500;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Custom middleware to capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalLoggerInfo = logger.info;
const originalLoggerError = logger.error;
const originalLoggerWarn = logger.warn;
const originalLoggerDebug = logger.debug;

// Function to add log entry and keep buffer at max size
function addLogEntry(message) {
  const timestamp = new Date().toISOString();
  logBuffer.push({ timestamp, message });
  
  // Keep log buffer at maximum size
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }
}

// Override console methods to capture logs
console.log = function(...args) {
  const message = args.join(' ');
  addLogEntry(message);
  originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
  const message = args.join(' ');
  addLogEntry(`ERROR: ${message}`);
  originalConsoleError.apply(console, args);
};

// Override logger methods
logger.info = function(message, meta) {
  addLogEntry(message);
  return originalLoggerInfo.call(logger, message, meta);
};

logger.error = function(message, meta) {
  addLogEntry(`ERROR: ${message}`);
  return originalLoggerError.call(logger, message, meta);
};

logger.warn = function(message, meta) {
  addLogEntry(`WARNING: ${message}`);
  return originalLoggerWarn.call(logger, message, meta);
};

logger.debug = function(message, meta) {
  addLogEntry(`DEBUG: ${message}`);
  return originalLoggerDebug.call(logger, message, meta);
};

// API Routes

// Get current configuration
app.get('/api/config', (req, res) => {
  const safeConfig = {
    email: {
      sender: config.get('TRACKER_EMAIL_SENDER') || '',
      recipient: config.get('TRACKER_EMAIL_RECIPIENT') || '',
      password: config.get('TRACKER_EMAIL_PASSWORD') ? '********' : '', // Don't send actual password
    },
    checkIntervalMinutes: config.get('TRACKER_CHECK_INTERVAL')
  };
  
  res.json(safeConfig);
});

// Update configuration
app.post('/api/config', (req, res) => {
  try {
    try {
      // Update process.env variables to be used when tracker starts
      if (req.body.email) {
        if (req.body.email.sender) {
          let senderEmail = req.body.email.sender;
          
          // Handle email format "Name <email@example.com>"
          if (senderEmail.includes('<') && senderEmail.includes('>')) {
            const matches = senderEmail.match(/<([^>]+)>/);
            if (matches && matches[1]) {
              // Extract email from the format
              senderEmail = matches[1];
            }
          }
          
          // Validate the extracted email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(senderEmail)) {
            return res.status(400).json({ 
              success: false, 
              message: 'Invalid sender email format. Please provide a valid email address.' 
            });
          }
          
          // Save the original format that may include name
          process.env.TRACKER_EMAIL_SENDER = req.body.email.sender;
        }
        
        if (req.body.email.recipient) process.env.TRACKER_EMAIL_RECIPIENT = req.body.email.recipient;
        if (req.body.email.password) process.env.TRACKER_EMAIL_PASSWORD = req.body.email.password;
      }
      
      if (req.body.checkIntervalMinutes) {
        process.env.TRACKER_CHECK_INTERVAL = req.body.checkIntervalMinutes;
      }
      
      // Reload configuration
      config.loadConfig();
    } catch (configError) {
      console.error('Configuration error:', configError.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Configuration error: ' + configError.message 
      });
    }
    
    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ success: false, message: 'Failed to update configuration: ' + error.message });
  }
});

// Start the tracker
app.post('/api/start', (req, res) => {
  try {
    if (trackerRunning) {
      return res.json({ success: false, message: 'Tracker is already running' });
    }
    
    // Initialize the tracker app
    trackerApp.init();
    
    // Start the tracker
    trackerApp.start();
    trackerRunning = true;
    
    console.log('Tracker started');
    res.json({ success: true, message: 'Tracker started' });
  } catch (error) {
    console.error('Error starting tracker:', error);
    res.status(500).json({ success: false, message: 'Failed to start tracker: ' + error.message });
  }
});

// Stop the tracker
app.post('/api/stop', (req, res) => {
  try {
    if (!trackerRunning) {
      return res.json({ success: false, message: 'Tracker is not running' });
    }
    
    // Stop the tracker
    trackerApp.stop();
    trackerRunning = false;
    
    console.log('Tracker stopped');
    res.json({ success: true, message: 'Tracker stopped' });
  } catch (error) {
    console.error('Error stopping tracker:', error);
    res.status(500).json({ success: false, message: 'Failed to stop tracker: ' + error.message });
  }
});

// Get tracker status
app.get('/api/status', (req, res) => {
  try {
    const status = trackerApp.getStatus ? trackerApp.getStatus() : {
      status: trackerRunning ? 'running' : 'stopped',
      uptime: 0,
      lastCheck: null,
      nextCheck: null,
      checkCount: 0,
      missedChecks: 0,
      currentAppointments: { regular: 0, mobile: 0 }
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ success: false, message: 'Failed to get status: ' + error.message });
  }
});

// Get logs
app.get('/api/logs', (req, res) => {
  res.json(logBuffer);
});

// Main app route - serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
server.listen(PORT, () => {
  console.log(`REAL ID Appointment Tracker Web Interface running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  if (trackerRunning && trackerApp.stop) {
    trackerApp.stop();
  }
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

module.exports = server;
