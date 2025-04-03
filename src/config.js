/**
 * Configuration for the REAL ID Appointment Tracker
 * 
 * Sensitive information like passwords can be provided via environment variables:
 * - TRACKER_EMAIL_SENDER: Email address to send notifications from
 * - TRACKER_EMAIL_RECIPIENT: Email address to send notifications to
 * - TRACKER_EMAIL_PASSWORD: App password for Gmail
 * - TRACKER_CHECK_INTERVAL: Check interval in minutes
 */

// Helper function to get environment variable with fallback
function getEnv(key, defaultValue) {
  return process.env[key] || defaultValue;
}

module.exports = {
  // URLs to check for appointments
  urls: {
    regular: getEnv('TRACKER_REGULAR_URL', 'https://telegov.njportal.com/njmvc/AppointmentWizard'),
    mobile: getEnv('TRACKER_MOBILE_URL', 'https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard')
  },
  
  // URLs to send in notifications
  notificationUrls: {
    regular: getEnv('TRACKER_REGULAR_NOTIFICATION_URL', 'https://telegov.njportal.com/njmvc/AppointmentWizard/12'),
    mobile: getEnv('TRACKER_MOBILE_NOTIFICATION_URL', 'https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard')
  },
  
  // Check interval in minutes
  checkIntervalMinutes: parseInt(getEnv('TRACKER_CHECK_INTERVAL', '10')),
  
  // Email configuration
  email: {
    // Sender email (Gmail)
    sender: getEnv('TRACKER_EMAIL_SENDER', 'adamb.capuana@gmail.com'),
    // Recipient email (Verizon email-to-text)
    recipient: getEnv('TRACKER_EMAIL_RECIPIENT', '7329957580@vtext.com'),
    // App password for Gmail (you'll need to generate this)
    // See: https://support.google.com/accounts/answer/185833
    // IMPORTANT: Prefer to set this via environment variable
    password: getEnv('TRACKER_EMAIL_PASSWORD', 'zczq xbiu hbrg wved'), // Gmail app password
    // Email subject
    subject: getEnv('TRACKER_EMAIL_SUBJECT', 'REAL ID Appointment Available!'),
  },
  
  // Logging
  logFile: getEnv('TRACKER_LOG_FILE', 'tracker.log')
};
