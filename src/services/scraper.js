/**
 * Enhanced web scraper for the REAL ID Appointment Tracker
 * 
 * Features:
 * - Robust HTML parsing with multiple fallback strategies
 * - Intelligent retry mechanism with exponential backoff
 * - Detection and handling of website structure changes
 * - Detailed error classification and reporting
 * - Support for connection pooling and proper header management
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger').child('scraper');
const { config } = require('../utils/config');

// Selector strategies for extracting appointment data
const SELECTOR_STRATEGIES = {
  regular: [
    {
      name: 'Primary Strategy',
      titleSelector: 'span.text-black.text-uppercase.cardButtonTitle',
      titleText: 'REAL ID',
      countSelector: 'span.text-black.cardButtonCount'
    },
    {
      name: 'Fallback Strategy',
      titleSelector: '.card-body h3',
      titleText: 'REAL ID',
      countSelector: '.appointment-count, .card-count'
    },
    {
      name: 'Last Resort Strategy',
      titleSelector: '[data-service="real-id"]',
      countSelector: '.count, .number, .appointments'
    }
  ],
  mobile: [
    {
      name: 'Primary Strategy',
      titleSelector: 'span.text-black.text-uppercase.cardButtonTitle',
      titleText: 'REAL ID - MOBILE',
      countSelector: 'span.text-black.cardButtonCount'
    },
    {
      name: 'Fallback Strategy',
      titleSelector: '.card-body h3',
      titleText: 'REAL ID - MOBILE',
      countSelector: '.appointment-count, .card-count'
    },
    {
      name: 'Last Resort Strategy',
      titleSelector: '[data-service="real-id-mobile"]',
      countSelector: '.count, .number, .appointments'
    }
  ]
};

class Scraper {
  constructor() {
    this.axiosInstance = axios.create({
      timeout: config.get('TRACKER_REQUEST_TIMEOUT'),
      headers: {
        'User-Agent': config.get('TRACKER_USER_AGENT'),
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 300
    });
    
    // Create debug directory if it doesn't exist
    this.debugDir = path.join(process.cwd(), 'debug');
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }
  
  /**
   * Calculate delay for exponential backoff with jitter
   * @param {number} attempt - Retry attempt number (0-indexed)
   * @returns {number} - Delay in milliseconds
   */
  _calculateBackoff(attempt) {
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 60000; // 1 minute
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
  }
  
  /**
   * Save HTML content for debugging
   * @param {string} html - HTML content
   * @param {string} type - Site type (regular, mobile)
   * @param {string} reason - Reason for saving
   */
  _saveDebugHtml(html, type, reason) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${type}-${reason}-${timestamp}.html`;
      const filepath = path.join(this.debugDir, filename);
      
      fs.writeFileSync(filepath, html);
      logger.debug(`Saved debug HTML to ${filepath}`, { type, reason });
    } catch (error) {
      logger.error(`Failed to save debug HTML: ${error.message}`, { error, type, reason });
    }
  }
  
  /**
   * Extract appointment count using multiple parsing strategies
   * @param {string} html - HTML content
   * @param {string} type - Site type (regular, mobile)
   * @returns {number} - Appointment count or -1 if parsing failed
   */
  _extractAppointmentCount(html, type) {
    const $ = cheerio.load(html);
    const strategies = SELECTOR_STRATEGIES[type];
    
    // First try our defined strategies
    for (const strategy of strategies) {
      logger.debug(`Trying ${strategy.name} for ${type} site`);
      
      let found = false;
      let count = 0;
      
      // Find the correct section based on title text
      $(strategy.titleSelector).each((i, el) => {
        const title = $(el).text().trim();
        if (title === strategy.titleText) {
          found = true;
          
          // Get the count element based on the current strategy
          let countElement;
          if (strategy.countSelector.includes(',')) {
            // Try multiple selectors
            const selectors = strategy.countSelector.split(',').map(s => s.trim());
            for (const selector of selectors) {
              countElement = $(el).parent().find(selector);
              if (countElement.length) break;
            }
          } else {
            countElement = $(el).parent().find(strategy.countSelector);
          }
          
          if (countElement && countElement.length) {
            const countText = countElement.text().trim();
            logger.debug(`Found count text: "${countText}" using ${strategy.name}`, { type });
            
            const match = countText.match(/(\d+)/);
            if (match) {
              count = parseInt(match[0], 10);
            } else {
              logger.warn(`Failed to parse count from text: "${countText}"`, { type, strategy: strategy.name });
            }
          } else {
            logger.warn(`Count element not found using ${strategy.name}`, { type });
          }
        }
      });
      
      if (found) {
        logger.debug(`Successfully parsed ${type} site using ${strategy.name}`, { count });
        return count;
      }
    }
    
    // If standard strategies failed, try generic approach by looking for the service type
    // and checking for any appointment count nearby
    logger.info(`Trying alternative extraction method for ${type} site`);
    
    // Search for any element containing the REAL ID text
    const searchText = type === 'regular' ? 'REAL ID' : 'REAL ID - MOBILE';
    const realIdElements = $('*').filter(function() {
      return $(this).text().trim().includes(searchText);
    });
    
    if (realIdElements.length > 0) {
      logger.info(`Found ${realIdElements.length} elements containing ${searchText}`);
      
      // For each potential REAL ID element, look for a count nearby
      for (let i = 0; i < realIdElements.length; i++) {
        const element = $(realIdElements[i]);
        const parentCard = element.closest('.overlay-card, .cardButton, .card');
        
        if (parentCard.length) {
          // Look for text containing digits
          const countTexts = parentCard.find('*').filter(function() {
            const text = $(this).text().trim();
            return text.match(/\d+\s*Appointments?\s*Available/i);
          });
          
          if (countTexts.length > 0) {
            const countText = countTexts.first().text().trim();
            const match = countText.match(/(\d+)/);
            if (match) {
              const count = parseInt(match[0], 10);
              logger.info(`Successfully extracted count using alternative method: ${count}`);
              return count;
            }
          }
        }
      }
    }
    
    // If all strategies failed, save HTML for debugging
    logger.warn(`Failed to parse ${type} site with all strategies`, { type });
    this._saveDebugHtml(html, type, 'parse-failed');
    return -1;
  }
  
  /**
   * Check for website structure changes by looking for expected elements
   * @param {string} html - HTML content
   * @param {string} type - Site type (regular, mobile)
   * @returns {boolean} - True if structure appears changed
   */
  _detectStructureChange(html, type) {
    const $ = cheerio.load(html);
    
    // Check if the page title contains expected text
    const title = $('title').text().toLowerCase();
    if (!title.includes('appointment') && !title.includes('njmvc') && !title.includes('telegov')) {
      logger.warn(`Website title changed: ${title}`);
      return true;
    }
    
    // Look for main page elements that should be present
    const mainContent = $('#mainContent');
    if (mainContent.length === 0) {
      logger.warn('Main content element not found');
      return true;
    }
    
    // Check for any appointment card elements
    const anyCardElements = $('.cardButton, .cardButtonTitle, .cardButtonCount');
    if (anyCardElements.length === 0) {
      logger.warn('No card elements found on page');
      return true;
    }
    
    // Page structure appears valid
    return false;
  }
  
  /**
   * Fetch HTML content from a URL with retries
   * @param {string} url - URL to fetch
   * @param {string} type - Site type for logging (regular, mobile)
   * @returns {Promise<string>} - HTML content
   * @throws {Error} If fetching fails after retries
   */
  async _fetchHtml(url, type) {
    const maxRetries = config.get('TRACKER_MAX_RETRIES');
    let retries = 0;
    let lastError = null;
    
    while (retries <= maxRetries) {
      try {
        if (retries > 0) {
          const delay = this._calculateBackoff(retries - 1);
          logger.info(`Retry ${retries}/${maxRetries} for ${type} site after ${Math.round(delay / 1000)} seconds`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        logger.info(`Checking ${type} site: ${url}`);
        
        const response = await this.axiosInstance.get(url);
        
        // Check for structure changes
        if (this._detectStructureChange(response.data, type)) {
          logger.warn(`Possible website structure change detected for ${type} site`, { url });
          this._saveDebugHtml(response.data, type, 'structure-change');
        }
        
        return response.data;
        
      } catch (error) {
        retries++;
        lastError = error;
        
        // Provide detailed error information
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.error(`Error checking ${type} site: Status ${error.response.status}`, { 
            url, 
            statusCode: error.response.status,
            statusText: error.response.statusText,
            retries,
            maxRetries
          });
          
          // If we got an error response with HTML, save it for debugging
          if (error.response.data && typeof error.response.data === 'string' && 
              error.response.data.includes('<html>')) {
            this._saveDebugHtml(error.response.data, type, `error-${error.response.status}`);
          }
        } else if (error.request) {
          // The request was made but no response was received
          logger.error(`Error checking ${type} site: No response received`, { 
            url, 
            errorCode: error.code,
            errorMessage: error.message,
            retries,
            maxRetries
          });
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.error(`Error checking ${type} site: ${error.message}`, { 
            url,
            errorMessage: error.message,
            retries,
            maxRetries
          });
        }
        
        if (retries > maxRetries) {
          logger.error(`Maximum retries (${maxRetries}) exceeded for ${type} site`);
          throw new Error(`Failed to fetch ${type} site after ${maxRetries} retries: ${lastError.message}`);
        }
      }
    }
  }
  
  /**
   * Check a website for REAL ID appointments
   * @param {string} type - Site type (regular, mobile)
   * @returns {Promise<number>} - Appointment count or -1 if check failed
   */
  async checkAppointments(type) {
    if (type !== 'regular' && type !== 'mobile') {
      throw new Error(`Invalid site type: ${type}`);
    }
    
    const url = config.get(`TRACKER_${type.toUpperCase()}_URL`);
    
    try {
      const html = await this._fetchHtml(url, type);
      const count = this._extractAppointmentCount(html, type);
      
      if (count >= 0) {
        logger.info(`${type} site has ${count} REAL ID appointments available`);
        return count;
      } else {
        logger.warn(`Failed to extract appointment count from ${type} site`);
        return -1;
      }
    } catch (error) {
      logger.error(`Failed to check ${type} site: ${error.message}`, { error });
      return -1;
    }
  }
}

module.exports = new Scraper();
