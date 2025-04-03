#!/usr/bin/env node
/**
 * REAL ID Appointment Tracker
 * 
 * Main entry point with command-line interface
 */

const App = require('./app');
const logger = require('./utils/logger');
const { config } = require('./utils/config');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'start';

// Get package version
const packageJson = require('../package.json');
const version = packageJson.version || '1.0.0';

/**
 * Display usage information
 */
function showUsage() {
  console.log(
`REAL ID Appointment Tracker (v${version})

Usage: node index.js [command]

Commands:
  start     Start the tracker (default)
  stop      Stop the tracker
  status    Show the current status
  test      Run a single test check without starting the tracker
  version   Show version information
  help      Show this help message
`);
}

/**
 * Display version information
 */
function showVersion() {
  console.log(`REAL ID Appointment Tracker v${version}`);
}

/**
 * Display formatted status information
 * @param {Object} status - Status object
 */
function displayStatus(status) {
  console.log(`
REAL ID Appointment Tracker Status
---------------------------------
Status: ${status.status.toUpperCase()}
Uptime: ${Math.floor(status.uptime / 60)} minutes
Last Check: ${status.lastCheck ? new Date(status.lastCheck).toLocaleString() : 'None'}
Next Check: ${status.nextCheck ? new Date(status.nextCheck).toLocaleString() : 'None'}
Check Count: ${status.checkCount}
Missed Checks: ${status.missedChecks}

Current Appointments:
- Regular DMV: ${status.currentAppointments.regular}
- Mobile Units: ${status.currentAppointments.mobile}

${status.status === 'running' ? 
  `The tracker is running and will check every ${config.get('TRACKER_CHECK_INTERVAL')} minutes.` : 
  'The tracker is currently stopped.'}
`);
}

/**
 * Display test results
 * @param {Object} results - Test results
 */
function displayTestResults(results) {
  console.log(`
REAL ID Appointment Tracker Test Results
---------------------------------------
Regular Site Check: ${results.regularSite.status}
${results.regularSite.count >= 0 ? `- Appointments Available: ${results.regularSite.count}` : '- Failed to check appointments'}

Mobile Site Check: ${results.mobileSite.status}
${results.mobileSite.count >= 0 ? `- Appointments Available: ${results.mobileSite.count}` : '- Failed to check appointments'}

Notification Test: ${results.notification.checked ? results.notification.status : 'Not tested (email not configured)'}

Test completed at ${new Date(results.timestamp).toLocaleString()}
`);
}

/**
 * Main function
 */
async function main() {
  // Create app instance
  const app = new App();
  
  try {
    // Process commands
    switch (command.toLowerCase()) {
      case 'start':
        // Initialize and start the app
        app.init();
        app.start();
        break;
        
      case 'stop':
        // Just display message (actual stopping is done via process management)
        console.log('To stop the tracker, press Ctrl+C or use the stop script.');
        process.exit(0);
        break;
        
      case 'status':
        // Initialize app to load configuration
        app.init();
        
        // Get and display status
        const status = app.getStatus();
        displayStatus(status);
        process.exit(0);
        break;
        
      case 'test':
        // Initialize app
        app.init();
        
        // Run test and display results
        console.log('Running test check. This may take a few moments...');
        const results = await app.runTest();
        displayTestResults(results);
        process.exit(0);
        break;
        
      case 'version':
        showVersion();
        process.exit(0);
        break;
        
      case 'help':
        showUsage();
        process.exit(0);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        showUsage();
        process.exit(1);
    }
  } catch (error) {
    logger.fatal(`Fatal error: ${error.message}`, { error });
    console.error(`\nError: ${error.message}`);
    console.error('See log file for more details.');
    process.exit(1);
  }
}

// Start the application
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
