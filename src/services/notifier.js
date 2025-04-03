/**
 * Enhanced notification service for the REAL ID Appointment Tracker
 * 
 * Features:
 * - Rich email notifications with HTML templates
 * - Multiple notification channels (email with SMS gateway support)
 * - Detailed appointment information in notifications
 * - Advanced retry mechanism with exponential backoff
 * - Robust error handling
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger').child('notifier');
const { config } = require('../utils/config');

class Notifier {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
    
    // Create template directory if it doesn't exist
    this.templateDir = path.join(process.cwd(), 'templates');
    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true });
    }
    
    // Create default email template if it doesn't exist
    this.createDefaultTemplate();
  }
  
  /**
   * Set up the email transporter
   */
  setupTransporter() {
    // Only set up transporter if email settings are configured
    if (config.hasValidEmailSettings()) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.get('TRACKER_EMAIL_SENDER'),
          pass: config.get('TRACKER_EMAIL_PASSWORD')
        },
        tls: {
          rejectUnauthorized: true // Enforce secure connections
        }
      });
      
      logger.debug('Email transporter configured');
    } else {
      logger.warn('Email settings incomplete. Notifications disabled.');
      this.transporter = null;
    }
  }
  
  /**
   * Create default HTML email template
   */
  createDefaultTemplate() {
    const templatePath = path.join(this.templateDir, 'email-template.html');
    
    // Only create if it doesn't exist
    if (!fs.existsSync(templatePath)) {
      const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REAL ID Appointment Available</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #1a73e8;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      background-color: #f9f9f9;
    }
    .appointment-info {
      background-color: white;
      border-left: 4px solid #1a73e8;
      padding: 15px;
      margin: 20px 0;
    }
    .appointment-count {
      font-size: 24px;
      font-weight: bold;
      color: #1a73e8;
    }
    .cta-button {
      display: inline-block;
      background-color: #1a73e8;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      margin-top: 20px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #777;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>REAL ID Appointment Available!</h1>
    </div>
    <div class="content">
      <p>Good news! REAL ID appointments are now available at the following location:</p>
      
      <div class="appointment-info">
        <p><strong>Location Type:</strong> {{locationType}}</p>
        <p><strong>Available Appointments:</strong> <span class="appointment-count">{{count}}</span></p>
        <p><strong>Detected At:</strong> {{timestamp}}</p>
      </div>
      
      <p>Don't wait! These appointments may be claimed quickly.</p>
      
      <a href="{{bookingUrl}}" class="cta-button">Book Your Appointment Now</a>
      
      <p style="margin-top: 30px; font-size: 14px;">
        <em>This is an automated notification from your REAL ID Appointment Tracker.</em>
      </p>
    </div>
    <div class="footer">
      <p>If you no longer wish to receive these notifications, update your tracker configuration.</p>
    </div>
  </div>
</body>
</html>`;
      
      fs.writeFileSync(templatePath, template);
      logger.debug('Created default email template');
    }
  }
  
  /**
   * Get HTML content from template with variables replaced
   * @param {string} type - Site type (regular, mobile)
   * @param {number} count - Appointment count
   * @returns {string} - Rendered HTML template
   */
  getEmailHtml(type, count) {
    try {
      const templatePath = path.join(this.templateDir, 'email-template.html');
      let template = fs.existsSync(templatePath) 
        ? fs.readFileSync(templatePath, 'utf8')
        : '<p>REAL ID Appointment Available!</p><p>{{count}} appointments at {{locationType}}</p><p><a href="{{bookingUrl}}">Book Now</a></p>';
      
      const locationType = type === 'regular' ? 'Regular DMV' : 'Mobile Unit';
      const bookingUrl = config.get(`TRACKER_${type.toUpperCase()}_NOTIFICATION_URL`);
      const timestamp = new Date().toLocaleString();
      
      // Replace template variables
      template = template
        .replace(/{{locationType}}/g, locationType)
        .replace(/{{count}}/g, count)
        .replace(/{{bookingUrl}}/g, bookingUrl)
        .replace(/{{timestamp}}/g, timestamp);
        
      return template;
    } catch (error) {
      logger.error(`Error generating email HTML: ${error.message}`, { error });
      // Fallback to plain text
      return `<p>REAL ID Appointment Available! ${count} appointments at ${type === 'regular' ? 'Regular DMV' : 'Mobile Unit'}. Book now: ${config.get(`TRACKER_${type.toUpperCase()}_NOTIFICATION_URL`)}</p>`;
    }
  }
  
  /**
   * Calculate delay for exponential backoff
   * @param {number} attempt - Retry attempt (0-based)
   * @returns {number} - Delay in milliseconds
   */
  _calculateBackoff(attempt) {
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 60000; // 1 minute
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
  }
  
  /**
   * Send notification with retry
   * @param {string} type - Site type (regular, mobile)
   * @param {number} count - Appointment count
   * @returns {Promise<boolean>} - Whether notification was sent successfully
   */
  async sendNotification(type, count) {
    if (!this.transporter) {
      logger.warn('Cannot send notification: Email transporter not configured');
      return false;
    }
    
    const siteName = type === 'regular' ? 'Regular DMV' : 'Mobile Unit';
    const notificationUrl = config.get(`TRACKER_${type.toUpperCase()}_NOTIFICATION_URL`);
    
    if (!notificationUrl) {
      logger.warn(`Cannot send notification: Missing notification URL for ${type} site`);
      return false;
    }
    
    const maxRetries = config.get('TRACKER_MAX_RETRIES');
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        if (retries > 0) {
          const delay = this._calculateBackoff(retries - 1);
          logger.info(`Retry ${retries}/${maxRetries} for sending notification after ${Math.round(delay / 1000)} seconds`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Send to Verizon SMS gateway with ultra-short message
        const phoneNumber = '7329957580@vtext.com';
        const shortText = `${count} REAL ID appt: ${notificationUrl}`;
        
        const smsOptions = {
          from: config.get('TRACKER_EMAIL_SENDER'),
          to: phoneNumber,
          subject: 'REAL ID Appt',
          text: shortText
          // No HTML for SMS to ensure compatibility
        };
        
        logger.info(`Sending SMS-friendly message to ${phoneNumber}`);
        await this.transporter.sendMail(smsOptions);
        
        // Also send to email with full content if configured
        const emailAddress = 'adamb.capuana@gmail.com';
        if (emailAddress) {
          const text = `${notificationUrl} - ${count} REAL ID appointment(s) available at ${siteName}!`;
          const html = this.getEmailHtml(type, count);
          
          const emailOptions = {
            from: config.get('TRACKER_EMAIL_SENDER'),
            to: emailAddress,
            subject: config.get('TRACKER_EMAIL_SUBJECT'),
            text: text,
            html: html
          };
          
          logger.info(`Sending detailed email to ${emailAddress}`);
          await this.transporter.sendMail(emailOptions);
        }
        logger.info(`Notification sent for ${type} site (${count} appointments)`);
        return true;
      } catch (error) {
        retries++;
        logger.error(`Error sending notification (attempt ${retries}): ${error.message}`, { error });
        
        if (retries > maxRetries) {
          logger.error(`Maximum retries (${maxRetries}) exceeded for sending notification`);
          return false;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Test the notification system
   * @returns {Promise<boolean>} - Whether test notification was sent successfully
   */
  async sendTestNotification() {
    if (!this.transporter) {
      logger.warn('Cannot send test notification: Email transporter not configured');
      return false;
    }
    
    try {
      // 1. Send test SMS to phone
      const phoneNumber = '7329957580@vtext.com';
      const shortText = `Test: REAL ID tracker working!`;
      
      const smsOptions = {
        from: config.get('TRACKER_EMAIL_SENDER'),
        to: phoneNumber,
        subject: 'Test',
        text: shortText
      };
      
      logger.info(`Sending test SMS to ${phoneNumber}`);
      await this.transporter.sendMail(smsOptions);
      
      // 2. Send detailed test email
      const emailAddress = 'adamb.capuana@gmail.com';
      if (emailAddress) {
        const text = `This is a test notification from your REAL ID Appointment Tracker. If you're receiving this, your notification system is working correctly.`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a73e8;">REAL ID Tracker Test Notification</h2>
            <p>This is a test notification from your REAL ID Appointment Tracker.</p>
            <p style="background-color: #e8f0fe; padding: 10px; border-left: 4px solid #1a73e8;">
              If you're receiving this, your notification system is working correctly.
            </p>
            <p style="font-size: 12px; color: #777; margin-top: 30px;">
              Sent at: ${new Date().toLocaleString()}
            </p>
          </div>
        `;
        
        const emailOptions = {
          from: config.get('TRACKER_EMAIL_SENDER'),
          to: emailAddress,
          subject: 'REAL ID Tracker - Test Notification',
          text: text,
          html: html
        };
        
        logger.info(`Sending detailed test email to ${emailAddress}`);
        await this.transporter.sendMail(emailOptions);
      }
      
      logger.info('Test notifications sent successfully');
      return true;
    } catch (error) {
      logger.error(`Error sending test notification: ${error.message}`, { error });
      return false;
    }
  }
}

module.exports = new Notifier();
