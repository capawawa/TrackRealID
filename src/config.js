/**
 * Configuration for the REAL ID Appointment Tracker
 */
module.exports = {
  // URLs to check for appointments
  urls: {
    regular: 'https://telegov.njportal.com/njmvc/AppointmentWizard',
    mobile: 'https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard'
  },
  
  // URLs to send in notifications
  notificationUrls: {
    regular: 'https://telegov.njportal.com/njmvc/AppointmentWizard/12',
    mobile: 'https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard'
  },
  
  // Check interval in minutes
  checkIntervalMinutes: 10,
  
  // Email configuration
  email: {
    // Sender email (Gmail)
    sender: '[REDACTED_EMAIL]',
    // Recipient email (Verizon email-to-text)
    recipient: '[REDACTED_RECIPIENT]',
    // App password for Gmail (you'll need to generate this)
    // See: https://support.google.com/accounts/answer/185833
    password: '[REDACTED_APP_PASSWORD]', // Gmail app password
    // Email subject
    subject: 'REAL ID Appointment Available!',
  },
  
  // Logging
  logFile: 'tracker.log'
};
