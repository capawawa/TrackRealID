/**
 * Appointment model for the REAL ID Appointment Tracker
 * 
 * Features:
 * - Structured appointment data storage
 * - Historical tracking of availability
 * - Data persistence
 * - State change detection
 */

const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger').child('appointment');

class AppointmentData {
  constructor({ id, type, count, timestamp, location }) {
    this.id = id || `${type}-${Date.now()}`;
    this.type = type; // 'regular' or 'mobile'
    this.count = count || 0;
    this.timestamp = timestamp || new Date();
    this.location = location || (type === 'regular' ? 'Regular DMV' : 'Mobile Unit');
  }
  
  /**
   * Convert to JSON-serializable object
   * @returns {Object} - Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      count: this.count,
      timestamp: this.timestamp.toISOString(),
      location: this.location
    };
  }
  
  /**
   * Create from JSON data
   * @param {Object} data - JSON data
   * @returns {AppointmentData} - Appointment data object
   */
  static fromJSON(data) {
    return new AppointmentData({
      id: data.id,
      type: data.type,
      count: data.count,
      timestamp: new Date(data.timestamp),
      location: data.location
    });
  }
}

class AppointmentStore {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data');
    this.dataFile = options.dataFile || path.join(this.dataDir, 'appointments.json');
    this.maxHistory = options.maxHistory || 100; // Maximum history entries per type
    
    // Current appointment state
    this.current = {
      regular: null,
      mobile: null
    };
    
    // Historical data
    this.history = {
      regular: [],
      mobile: []
    };
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Try to load existing data
    this.load();
  }
  
  /**
   * Load data from storage
   */
  load() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        
        // Load current state
        if (data.current) {
          if (data.current.regular) {
            this.current.regular = AppointmentData.fromJSON(data.current.regular);
          }
          if (data.current.mobile) {
            this.current.mobile = AppointmentData.fromJSON(data.current.mobile);
          }
        }
        
        // Load history
        if (data.history) {
          if (Array.isArray(data.history.regular)) {
            this.history.regular = data.history.regular.map(item => 
              AppointmentData.fromJSON(item)
            );
          }
          if (Array.isArray(data.history.mobile)) {
            this.history.mobile = data.history.mobile.map(item => 
              AppointmentData.fromJSON(item)
            );
          }
        }
        
        logger.info('Appointment data loaded from storage');
      } else {
        logger.info('No existing appointment data found');
      }
    } catch (error) {
      logger.error(`Error loading appointment data: ${error.message}`, { error });
    }
  }
  
  /**
   * Save data to storage
   */
  save() {
    try {
      const data = {
        current: {
          regular: this.current.regular ? this.current.regular.toJSON() : null,
          mobile: this.current.mobile ? this.current.mobile.toJSON() : null
        },
        history: {
          regular: this.history.regular.map(item => item.toJSON()),
          mobile: this.history.mobile.map(item => item.toJSON())
        }
      };
      
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      logger.debug('Appointment data saved to storage');
    } catch (error) {
      logger.error(`Error saving appointment data: ${error.message}`, { error });
    }
  }
  
  /**
   * Update appointment data
   * @param {string} type - Appointment type ('regular' or 'mobile')
   * @param {number} count - Appointment count
   * @returns {Object} - Information about the update
   */
  update(type, count) {
    if (type !== 'regular' && type !== 'mobile') {
      throw new Error(`Invalid appointment type: ${type}`);
    }
    
    // Create new appointment data
    const newData = new AppointmentData({
      type,
      count,
      timestamp: new Date()
    });
    
    // Check if state has changed
    const previousData = this.current[type];
    const hasChanged = !previousData || previousData.count !== count;
    
    // Only process updates if state has changed or previous data is null
    if (hasChanged) {
      logger.info(`Appointment state changed for ${type}: ${previousData?.count || 0} -> ${count}`);
      
      // Add to history (only when count increases from 0)
      if ((!previousData || previousData.count === 0) && count > 0) {
        this.history[type].unshift(newData);
        
        // Trim history to maximum length
        if (this.history[type].length > this.maxHistory) {
          this.history[type] = this.history[type].slice(0, this.maxHistory);
        }
      }
      
      // Update current state
      this.current[type] = newData;
      
      // Save to storage
      this.save();
    }
    
    return {
      type,
      count,
      previousCount: previousData?.count || 0,
      hasChanged,
      becameAvailable: count > 0 && (!previousData || previousData.count === 0),
      timestamp: newData.timestamp
    };
  }
  
  /**
   * Get current appointment state
   * @param {string} [type] - Optional type filter ('regular' or 'mobile')
   * @returns {Object} - Current appointment state
   */
  getCurrentState(type) {
    if (type) {
      return this.current[type];
    }
    return this.current;
  }
  
  /**
   * Get appointment history
   * @param {string} [type] - Optional type filter ('regular' or 'mobile')
   * @param {number} [limit] - Maximum number of entries to return
   * @returns {Array} - Appointment history
   */
  getHistory(type, limit) {
    if (type) {
      return limit ? this.history[type].slice(0, limit) : this.history[type];
    }
    
    // Return combined history, sorted by timestamp (newest first)
    const combined = [
      ...this.history.regular,
      ...this.history.mobile
    ].sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? combined.slice(0, limit) : combined;
  }
  
  /**
   * Get latest appointment data
   * @param {string} type - Appointment type ('regular' or 'mobile')
   * @returns {AppointmentData|null} - Latest appointment data or null
   */
  getLatest(type) {
    return this.current[type];
  }
  
  /**
   * Clear history for a specific type or all
   * @param {string} [type] - Optional type to clear ('regular' or 'mobile')
   */
  clearHistory(type) {
    if (type) {
      this.history[type] = [];
    } else {
      this.history.regular = [];
      this.history.mobile = [];
    }
    this.save();
    logger.info(`Appointment history cleared${type ? ` for ${type}` : ''}`);
  }
}

module.exports = {
  AppointmentData,
  AppointmentStore,
  store: new AppointmentStore() // Singleton instance
};
