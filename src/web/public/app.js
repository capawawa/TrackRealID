/**
 * REAL ID Appointment Tracker Web Interface
 * Client-side JavaScript
 */

// DOM Elements
const configForm = document.getElementById('config-form');
const senderNameInput = document.getElementById('sender-name');
const senderEmailInput = document.getElementById('sender-email');
const appPasswordInput = document.getElementById('app-password');
const recipientEmailsContainer = document.getElementById('recipient-emails-container');
const phoneEmailsContainer = document.getElementById('phone-emails-container');
const addRecipientEmailBtn = document.getElementById('add-recipient-email');
const addPhoneEmailBtn = document.getElementById('add-phone-email');
const checkIntervalInput = document.getElementById('check-interval');
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');
const lastCheckElem = document.getElementById('last-check');
const nextCheckElem = document.getElementById('next-check');
const checkCountElem = document.getElementById('check-count');
const regularAppointmentsElem = document.getElementById('regular-appointments');
const mobileAppointmentsElem = document.getElementById('mobile-appointments');
const logDisplay = document.getElementById('log-display');
const toast = document.getElementById('toast');

// State
let isRunning = false;
let statusInterval = null;
let logInterval = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    setupEventListeners();
    updateStatus();
    fetchLogs();
    
    // Set up intervals for updates
    statusInterval = setInterval(updateStatus, 5000);
    logInterval = setInterval(fetchLogs, 3000);
});

// Setup event listeners
function setupEventListeners() {
    // Form submission
    configForm.addEventListener('submit', saveConfig);
    
    // Add email buttons
    addRecipientEmailBtn.addEventListener('click', () => addEmailField(recipientEmailsContainer, 'recipient-email[]', 'you@example.com'));
    addPhoneEmailBtn.addEventListener('click', () => addEmailField(phoneEmailsContainer, 'phone-email[]', 'phonenumber@carrier.com'));
    
    // Start/Stop buttons
    startButton.addEventListener('click', startTracker);
    stopButton.addEventListener('click', stopTracker);
}

// Load configuration from the server
function loadConfig() {
    fetch('/api/config')
        .then(response => response.json())
        .then(config => {
            // Populate form fields
            if (config.email) {
                // Attempt to extract sender name from email
                const emailParts = config.email.sender.split('<');
                if (emailParts.length > 1) {
                    // Format: "Name <email>"
                    senderNameInput.value = emailParts[0].trim();
                    senderEmailInput.value = emailParts[1].replace('>', '').trim();
                } else {
                    // Just email address
                    senderEmailInput.value = config.email.sender;
                }
                
                // Check if password was previously set
                if (config.email.password) {
                    appPasswordInput.placeholder = "••••••••••••••••";
                }
                
                // Set up recipient emails
                if (config.email.recipient) {
                    // Clear default field
                    recipientEmailsContainer.innerHTML = '';
                    
                    // Split recipients (could be comma-separated)
                    const recipients = config.email.recipient.split(',');
                    
                    recipients.forEach(recipient => {
                        recipient = recipient.trim();
                        if (recipient) {
                            // Determine if it's a phone email or regular email
                            const isPhoneEmail = recipient.includes('@vtext.com') || 
                                                recipient.includes('@txt.att.net') || 
                                                recipient.includes('@tmomail.net') ||
                                                recipient.includes('@messaging.sprintpcs.com') ||
                                                recipient.includes('@msg.fi.google.com');
                            
                            if (isPhoneEmail) {
                                addEmailField(phoneEmailsContainer, 'phone-email[]', recipient, true);
                            } else {
                                addEmailField(recipientEmailsContainer, 'recipient-email[]', recipient, true);
                            }
                        }
                    });
                    
                    // If no recipients were added, add a blank one
                    if (recipientEmailsContainer.children.length === 0) {
                        addEmailField(recipientEmailsContainer, 'recipient-email[]', '', false);
                    }
                    
                    // If no phone emails were detected, ensure there's at least one blank field
                    if (phoneEmailsContainer.children.length === 0) {
                        const firstPhoneInput = phoneEmailsContainer.querySelector('.phone-email');
                        if (!firstPhoneInput) {
                            addEmailField(phoneEmailsContainer, 'phone-email[]', '', false);
                        }
                    }
                }
            }
            
            // Set check interval
            if (config.checkIntervalMinutes) {
                checkIntervalInput.value = config.checkIntervalMinutes;
            }
        })
        .catch(error => {
            console.error('Error loading configuration:', error);
            showToast('Error loading configuration', 'error');
        });
}

// Save configuration
function saveConfig(event) {
    event.preventDefault();
    
    // Get values from form
    const senderName = senderNameInput.value.trim();
    const senderEmail = senderEmailInput.value.trim();
    const appPassword = appPasswordInput.value.trim();
    const checkInterval = parseInt(checkIntervalInput.value, 10);
    
    // Get all recipient emails
    const recipientEmails = [];
    document.querySelectorAll('.recipient-email').forEach(input => {
        if (input.value.trim()) {
            recipientEmails.push(input.value.trim());
        }
    });
    
    // Get all phone emails
    document.querySelectorAll('.phone-email').forEach(input => {
        if (input.value.trim()) {
            recipientEmails.push(input.value.trim());
        }
    });
    
    // Validate inputs
    if (!senderEmail) {
        showToast('Sender email is required', 'error');
        return;
    }
    
    if (recipientEmails.length === 0) {
        showToast('At least one recipient email is required', 'error');
        return;
    }
    
    if (checkInterval < 1) {
        showToast('Check interval must be at least 1 minute', 'error');
        return;
    }
    
    // Create formatted sender (include name if provided)
    let formattedSender = senderEmail;
    if (senderName) {
        formattedSender = `${senderName} <${senderEmail}>`;
    }
    
    // Create configuration object
    const configData = {
        email: {
            sender: formattedSender,
            recipient: recipientEmails.join(',')
        },
        checkIntervalMinutes: checkInterval
    };
    
    // Only include password if it was changed
    if (appPassword) {
        configData.email.password = appPassword;
    }
    
    // Save configuration
    fetch('/api/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Configuration saved successfully', 'success');
            
            // Clear password field but keep placeholder
            appPasswordInput.value = '';
            appPasswordInput.placeholder = "••••••••••••••••";
        } else {
            showToast('Error saving configuration: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error saving configuration:', error);
        showToast('Error saving configuration', 'error');
    });
}

// Add a new email input field
function addEmailField(container, name, placeholder, withValue = false) {
    const group = document.createElement('div');
    group.className = 'email-input-group';
    
    const input = document.createElement('input');
    input.type = 'email';
    input.className = name.includes('recipient') ? 'recipient-email' : 'phone-email';
    input.name = name;
    input.placeholder = placeholder;
    
    if (withValue) {
        input.value = placeholder;
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-email-btn';
    removeBtn.textContent = '-';
    removeBtn.addEventListener('click', function() {
        container.removeChild(group);
        
        // Ensure there's always at least one input field
        if (container.children.length === 0) {
            addEmailField(container, name, placeholder);
        }
        
        // Update button states
        updateRemoveButtons(container);
    });
    
    group.appendChild(input);
    group.appendChild(removeBtn);
    container.appendChild(group);
    
    // Update button states
    updateRemoveButtons(container);
}

// Update the state of remove buttons
function updateRemoveButtons(container) {
    const buttons = container.querySelectorAll('.remove-email-btn');
    
    // Disable the remove button if there's only one input
    buttons.forEach(button => {
        button.disabled = buttons.length === 1;
    });
}

// Start the tracker
function startTracker() {
    fetch('/api/start', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Tracker started', 'success');
            isRunning = true;
            updateButtons();
            updateStatus();
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error starting tracker:', error);
        showToast('Error starting tracker', 'error');
    });
}

// Stop the tracker
function stopTracker() {
    fetch('/api/stop', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Tracker stopped', 'success');
            isRunning = false;
            updateButtons();
            updateStatus();
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error stopping tracker:', error);
        showToast('Error stopping tracker', 'error');
    });
}

// Update the status display
function updateStatus() {
    fetch('/api/status')
        .then(response => response.json())
        .then(status => {
            // Update running state
            isRunning = status.status === 'running';
            updateButtons();
            
            // Update status indicator
            statusText.textContent = isRunning ? 'Running' : 'Not Running';
            statusIndicator.className = 'status-indicator ' + (isRunning ? 'running' : 'stopped');
            
            // Update status details
            lastCheckElem.textContent = status.lastCheck ? new Date(status.lastCheck).toLocaleString() : 'Never';
            nextCheckElem.textContent = status.nextCheck ? new Date(status.nextCheck).toLocaleString() : 'N/A';
            checkCountElem.textContent = status.checkCount || '0';
            
            // Update appointment counts
            regularAppointmentsElem.textContent = status.currentAppointments?.regular || '0';
            mobileAppointmentsElem.textContent = status.currentAppointments?.mobile || '0';
        })
        .catch(error => {
            console.error('Error updating status:', error);
        });
}

// Update button states
function updateButtons() {
    startButton.disabled = isRunning;
    stopButton.disabled = !isRunning;
}

// Fetch and display logs
function fetchLogs() {
    fetch('/api/logs')
        .then(response => response.json())
        .then(logs => {
            logDisplay.innerHTML = ''; // Clear existing logs
            
            logs.forEach(log => {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                
                // Add error/warning classes
                if (log.message.includes('ERROR')) {
                    logEntry.classList.add('error');
                } else if (log.message.includes('WARNING')) {
                    logEntry.classList.add('warning');
                }
                
                // Format timestamp
                const date = new Date(log.timestamp);
                const timestamp = date.toLocaleString();
                
                logEntry.textContent = `${timestamp}: ${log.message}`;
                logDisplay.appendChild(logEntry);
            });
            
            // Auto-scroll to bottom
            logDisplay.scrollTop = logDisplay.scrollHeight;
        })
        .catch(error => {
            console.error('Error fetching logs:', error);
        });
}

// Show toast notification
function showToast(message, type = 'info') {
    // Set message and type
    toast.textContent = message;
    toast.className = 'toast';
    toast.classList.add(type);
    
    // Show toast
    toast.classList.remove('hidden');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    clearInterval(statusInterval);
    clearInterval(logInterval);
});
