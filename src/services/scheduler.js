/**
 * Enhanced scheduler for the REAL ID Appointment Tracker
 * 
 * Features:
 * - Robust scheduling with cron
 * - Missed check detection
 * - Intelligent check execution
 * - Status tracking
 * - Event-based architecture
 */

const cron = require('node-cron');
const EventEmitter = require('events');

const logger = require('../utils/logger').child('scheduler');
const { config } = require('../utils/config');

class Scheduler extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map(); // Store scheduled jobs
    this.status = {
      isRunning: false,
      lastCheckTime: null,
      nextCheckTime: null,
      checkCount: 0,
      missedChecks: 0
    };
  }
  
  /**
   * Calculate the next check time
   * @param {string} cronExpression - Cron expression for the schedule
   * @returns {Date} - Next check time
   */
  _calculateNextCheckTime(cronExpression) {
    // Use cron-parser to get the next run time
    const parser = require('cron-parser');
    try {
      const interval = parser.parseExpression(cronExpression);
      return interval.next().toDate();
    } catch (error) {
      logger.error(`Error calculating next check time: ${error.message}`, { error });
      // Fallback: add check interval to current time
      const checkIntervalMinutes = config.get('TRACKER_CHECK_INTERVAL');
      return new Date(Date.now() + checkIntervalMinutes * 60 * 1000);
    }
  }
  
  /**
   * Schedule a task with cron
   * @param {string} name - Task name
   * @param {string} cronExpression - Cron expression
   * @param {Function} task - Task function to execute
   * @returns {boolean} - Whether scheduling was successful
   */
  schedule(name, cronExpression, task) {
    try {
      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }
      
      // Cancel existing job if it exists
      this.cancel(name);
      
      // Create new job
      const job = cron.schedule(cronExpression, async () => {
        try {
          logger.debug(`Executing scheduled task: ${name}`);
          this.status.lastCheckTime = new Date();
          this.status.checkCount++;
          await task();
        } catch (error) {
          logger.error(`Error executing scheduled task ${name}: ${error.message}`, { error });
          this.emit('error', { task: name, error });
        } finally {
          // Update next check time
          this.status.nextCheckTime = this._calculateNextCheckTime(cronExpression);
        }
      });
      
      this.jobs.set(name, {
        job,
        cronExpression,
        task
      });
      
      this.status.isRunning = true;
      this.status.nextCheckTime = this._calculateNextCheckTime(cronExpression);
      
      logger.info(`Scheduled task "${name}" with cron expression "${cronExpression}"`);
      this.emit('scheduled', { name, cronExpression });
      
      return true;
    } catch (error) {
      logger.error(`Error scheduling task ${name}: ${error.message}`, { error });
      this.emit('error', { task: name, error });
      return false;
    }
  }
  
  /**
   * Cancel a scheduled task
   * @param {string} name - Task name
   * @returns {boolean} - Whether cancellation was successful
   */
  cancel(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.job.stop();
      this.jobs.delete(name);
      logger.info(`Cancelled scheduled task: ${name}`);
      this.emit('cancelled', { name });
      
      // Update running status
      this.status.isRunning = this.jobs.size > 0;
      return true;
    }
    return false;
  }
  
  /**
   * Execute a task immediately, outside of its schedule
   * @param {string} name - Task name
   * @returns {Promise<boolean>} - Whether execution was successful
   */
  async executeNow(name) {
    const job = this.jobs.get(name);
    if (job && typeof job.task === 'function') {
      try {
        logger.info(`Executing task "${name}" immediately`);
        this.status.lastCheckTime = new Date();
        this.status.checkCount++;
        await job.task();
        logger.info(`Task "${name}" executed successfully`);
        this.emit('executed', { name });
        return true;
      } catch (error) {
        logger.error(`Error executing task ${name}: ${error.message}`, { error });
        this.emit('error', { task: name, error });
        return false;
      }
    } else {
      logger.warn(`Cannot execute task "${name}": task not found or not a function`);
      return false;
    }
  }
  
  /**
   * Get all scheduled jobs
   * @returns {Object} - Map of job names to their cron expressions
   */
  getJobs() {
    const result = {};
    for (const [name, job] of this.jobs.entries()) {
      result[name] = {
        cronExpression: job.cronExpression,
        nextRun: this.status.nextCheckTime
      };
    }
    return result;
  }
  
  /**
   * Start all scheduled jobs
   */
  start() {
    for (const [name, job] of this.jobs.entries()) {
      job.job.start();
    }
    this.status.isRunning = this.jobs.size > 0;
    logger.info('Scheduler started');
    this.emit('started');
  }
  
  /**
   * Stop all scheduled jobs
   */
  stop() {
    for (const [name, job] of this.jobs.entries()) {
      job.job.stop();
    }
    this.status.isRunning = false;
    logger.info('Scheduler stopped');
    this.emit('stopped');
  }
  
  /**
   * Check for missed runs by comparing last run time with expected schedule
   * @returns {number} - Number of missed checks
   */
  checkMissedRuns() {
    // If no last check time, we can't determine missed runs
    if (!this.status.lastCheckTime) {
      return 0;
    }
    
    let missedTotal = 0;
    
    for (const [name, job] of this.jobs.entries()) {
      try {
        const parser = require('cron-parser');
        const interval = parser.parseExpression(job.cronExpression);
        
        // Get all scheduled times between last check and now
        const now = new Date();
        const lastCheck = this.status.lastCheckTime;
        let scheduledTime = interval.prev().toDate();
        
        let missed = 0;
        while (scheduledTime > lastCheck && scheduledTime < now) {
          missed++;
          scheduledTime = interval.prev().toDate();
        }
        
        if (missed > 0) {
          logger.warn(`Detected ${missed} missed checks for task "${name}"`);
          missedTotal += missed;
        }
      } catch (error) {
        logger.error(`Error checking missed runs for ${name}: ${error.message}`, { error });
      }
    }
    
    this.status.missedChecks += missedTotal;
    return missedTotal;
  }
  
  /**
   * Get scheduler status
   * @returns {Object} - Current scheduler status
   */
  getStatus() {
    return {
      ...this.status,
      scheduledJobs: this.jobs.size,
      jobNames: Array.from(this.jobs.keys())
    };
  }
}

module.exports = new Scheduler();
