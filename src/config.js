/**
 * Configuration for the REAL ID Appointment Tracker
 */
module.exports = {
  // URLs to check for appointments
  urls: {
    regular: 'https://telegov.njportal.com/njmvc/AppointmentWizard',
    mobile: 'https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard'
  },
  
  // Check interval in minutes
  checkIntervalMinutes: 30,
  
  // Email configuration
  email: {
    // Sender email (Gmail)
    sender: 'adamb.capuana@gmail.com',
    // Recipient email (Verizon email-to-text)
    recipient: '7329957580@vtext.com',
    // App password for Gmail (you'll need to generate this)
    // See: https://support.google.com/accounts/answer/185833
    password: '', // You'll need to fill this in
    // Email subject
    subject: 'REAL ID Appointment Available!',
  },
  
  // Logging
  logFile: 'tracker.log'
};
