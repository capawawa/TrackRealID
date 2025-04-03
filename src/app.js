/**
 * Core application logic for the REAL ID Appointment Tracker
 * 
 * Features:
 * - Integration of all services and modules
 * - Robust error handling and recovery
 * - Proper initialization and shutdown
 * - Support for various operation modes (normal, test)
 * - Clean separation of concerns
 */

const scheduler = require('./services/scheduler');
const scraper = require('./services/scraper');
const notifier = require('./services/notifier');
const { store: appointmentStore } = require('./models/appointment');
const logger = require('./utils/logger').child('app');
const { config } = require('./utils/config');

class App {
  constructor() {
    this.initialized = false;
    this.shuttingDown = false;
    this.registerEventHandlers();
  }
  
  /**
   * Register event handlers for system events
   */
  registerEventHandlers() {
    // Handle scheduler events
    scheduler.on('error', (error) => {
      logger.error(`Scheduler error: ${error.message}`, { error });
    });

    // Handle process termination signals
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));

    // Handle unhandled errors
    process.on('uncaughtException', (error) => {
      logger.fatal(`Uncaught exception: ${error.message}`, { error });
      // Give logger time to flush before exiting
      setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal(`Unhandled promise rejection: ${reason}`, { reason });
    });
  }
  
  /**
   * Initialize the application
   */
  init() {
    if (this.initialized) {
      logger.warn('App already initialized, skipping');
      return;
    }
    
    logger.info('Initializing REAL ID Appointment Tracker');
    
    // Log configuration (without sensitive data)
    logger.info('Using configuration:', { config: config.getSafeConfig() });
    
    // Set up logger level from config
    logger.setLevel(config.get('TRACKER_LOG_LEVEL') || 'info');
    
    this.initialized = true;
    logger.info('Application initialized successfully');
  }
  
  /**
   * Start the application
   */
  start() {
    if (!this.initialized) {
      this.init();
    }
    
    logger.info('Starting REAL ID Appointment Tracker');
    
    // Schedule regular checks
    const checkIntervalMinutes = config.get('TRACKER_CHECK_INTERVAL');
    const cronExpression = `*/${checkIntervalMinutes} * * * *`;
    
    scheduler.schedule('appointmentCheck', cronExpression, async () => {
      await this.runCheck();
    });
    
    // Start the scheduler
    scheduler.start();
    
    logger.info(`Tracker running. Checking every ${checkIntervalMinutes} minutes.`);
    
    // Run an initial check
    this.runCheck().catch(error => {
      logger.error(`Error during initial check: ${error.message}`, { error });
    });
  }
  
  /**
   * Run a single check of both websites
   * @returns {Promise<void>}
   */
  async runCheck() {
    logger.info('Starting appointment check...');
    
    try {
      // Check regular site
      const regularCount = await scraper.checkAppointments('regular');
      
      if (regularCount >= 0) {
        // Update appointment store
        const regularUpdate = appointmentStore.update('regular', regularCount);
        
        // Send notification if newly available
        if (regularUpdate.becameAvailable) {
          logger.info(`ALERT: Regular site now has ${regularCount} appointments available!`);
          await notifier.sendNotification('regular', regularCount);
        }
      }
      
      // Check mobile site
      const mobileCount = await scraper.checkAppointments('mobile');
      
      if (mobileCount >= 0) {
        // Update appointment store
        const mobileUpdate = appointmentStore.update('mobile', mobileCount);
        
        // Send notification if newly available
        if (mobileUpdate.becameAvailable) {
          logger.info(`ALERT: Mobile site now has ${mobileCount} appointments available!`);
          await notifier.sendNotification('mobile', mobileCount);
        }
      }
      
      logger.info('Check completed successfully');
      return {
        regular: regularCount,
        mobile: mobileCount
      };
    } catch (error) {
      logger.error(`Error during check: ${error.message}`, { error });
      throw error;
    }
  }
  
  /**
   * Run a test check (no notifications, just verify functionality)
   * @returns {Promise<Object>} - Test results
   */
  async runTest() {
    logger.info('Running system test...');
    
    try {
      // Test regular site check
      logger.info('Testing regular site check...');
      const regularCount = await scraper.checkAppointments('regular');
      logger.info(`Regular site check result: ${regularCount} appointments`);
      
      // Test mobile site check
      logger.info('Testing mobile site check...');
      const mobileCount = await scraper.checkAppointments('mobile');
      logger.info(`Mobile site check result: ${mobileCount} appointments`);
      
      // Test notification system if email configured
      let notificationResult = 'Not tested (email not configured)';
      if (config.hasValidEmailSettings()) {
        logger.info('Testing notification system...');
        const notificationSuccess = await notifier.sendTestNotification();
        notificationResult = notificationSuccess ? 'Success' : 'Failed';
        logger.info(`Notification test result: ${notificationResult}`);
      }
      
      const results = {
        regularSite: {
          checked: true,
          count: regularCount,
          status: regularCount >= 0 ? 'Success' : 'Failed'
        },
        mobileSite: {
          checked: true,
          count: mobileCount,
          status: mobileCount >= 0 ? 'Success' : 'Failed'
        },
        notification: {
          checked: config.hasValidEmailSettings(),
          status: notificationResult
        },
        timestamp: new Date().toISOString()
      };
      
      logger.info('Test completed:', { results });
      return results;
    } catch (error) {
      logger.error(`Error during test: ${error.message}`, { error });
      throw error;
    }
  }
  
  /**
   * Get current system status
   * @returns {Object} - System status
   */
  getStatus() {
    const schedulerStatus = scheduler.getStatus();
    const regularState = appointmentStore.getCurrentState('regular');
    const mobileState = appointmentStore.getCurrentState('mobile');
    
    return {
      status: schedulerStatus.isRunning ? 'running' : 'stopped',
      uptime: process.uptime(),
      lastCheck: schedulerStatus.lastCheckTime,
      nextCheck: schedulerStatus.nextCheckTime,
      checkCount: schedulerStatus.checkCount,
      missedChecks: schedulerStatus.missedChecks,
      currentAppointments: {
        regular: regularState ? regularState.count : 0,
        mobile: mobileState ? mobileState.count : 0
      },
      scheduledJobs: schedulerStatus.scheduledJobs,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Stop the application
   */
  stop() {
    logger.info('Stopping the tracker...');
    scheduler.stop();
    logger.info('Tracker stopped');
  }
  
  /**
   * Gracefully shut down the application
   * @param {string} [signal] - Signal that triggered shutdown
   */
  shutdown(signal) {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    
    logger.info(`Shutting down gracefully${signal ? ` (signal: ${signal})` : ''}...`);
    
    try {
      // Stop the scheduler
      scheduler.stop();
      
      // Save any pending data
      appointmentStore.save();
      
      logger.info('Shutdown complete');
    } catch (error) {
      logger.error(`Error during shutdown: ${error.message}`, { error });
    } finally {
      // Exit with success code
      process.exit(0);
    }
  }
}

module.exports = App;
