# REAL ID Appointment Tracker v2.0.0

A robust, feature-rich Node.js application that monitors the New Jersey MVC websites for REAL ID appointment availability and sends notifications when appointments become available. This enhanced version includes advanced error handling, improved parsing, structured logging, and many other reliability improvements.

## New Features & Enhancements

### Architecture & Code Quality
- **Modular Design**: Completely refactored into logical modules for better maintainability
- **Enhanced Error Handling**: Comprehensive error management with detailed reporting
- **Configuration Validation**: Robust validation with helpful error messages
- **Code Documentation**: Extensive JSDoc comments throughout the codebase

### Reliability Enhancements
- **Multi-strategy HTML Parsing**: Multiple fallback strategies for parsing website data
- **Structure Change Detection**: Automatic detection of website structure changes
- **Self-healing Operation**: Graceful degradation and recovery from errors
- **Advanced Retry Logic**: Exponential backoff with jitter for optimal retry behavior

### User Experience Improvements
- **Rich Notifications**: HTML email templates with detailed appointment information
- **Historical Tracking**: Store and track appointment availability over time
- **Enhanced Status Reporting**: Detailed status information and metrics
- **Improved Testing**: Comprehensive test mode to validate all system components

### Security & Performance
- **Secure Credential Handling**: Improved security for sensitive configuration
- **Resource Optimization**: Efficient memory and connection management
- **Log Rotation**: Automatic log file rotation to prevent disk space issues

## Prerequisites

- Node.js (v12 or higher)
- npm (comes with Node.js)
- A Gmail account to send notifications from

## Installation

1. Clone or download this repository

2. Install dependencies:

```bash
npm install
```

3. Configure the application:
   - Copy `.env.example` to `.env` and edit the values
   - Or set the environment variables directly
   
### Gmail App Password Setup

To send email notifications, you need to generate an "App Password" for your Gmail account:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Select "Security"
3. Under "Signing in to Google," select "2-Step Verification" (you must have this enabled)
4. At the bottom of the page, select "App passwords"
5. Generate a new app password for "Mail" and "Other (Custom name)" - name it "REAL ID Tracker"
6. Copy the 16-character password
7. Add it to your `.env` file as `TRACKER_EMAIL_PASSWORD`

## Configuration Options

The application supports the following configuration options:

| Environment Variable | Description | Default |
|----------------------|-------------|---------|
| `TRACKER_REGULAR_URL` | URL of the regular DMV site | https://telegov.njportal.com/njmvc/AppointmentWizard |
| `TRACKER_MOBILE_URL` | URL of the mobile unit site | https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard |
| `TRACKER_REGULAR_NOTIFICATION_URL` | URL to include in regular site notifications | https://telegov.njportal.com/njmvc/AppointmentWizard/12 |
| `TRACKER_MOBILE_NOTIFICATION_URL` | URL to include in mobile site notifications | https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard |
| `TRACKER_CHECK_INTERVAL` | Check interval in minutes | 10 |
| `TRACKER_EMAIL_SENDER` | Gmail address to send notifications from | |
| `TRACKER_EMAIL_RECIPIENT` | Email address to send notifications to | |
| `TRACKER_EMAIL_PASSWORD` | App password for Gmail | |
| `TRACKER_EMAIL_SUBJECT` | Subject line for notification emails | REAL ID Appointment Available! |
| `TRACKER_LOG_FILE` | Log file path | tracker.log |
| `TRACKER_LOG_LEVEL` | Log level (debug, info, warn, error, fatal) | info |
| `TRACKER_REQUEST_TIMEOUT` | HTTP request timeout in milliseconds | 30000 |
| `TRACKER_MAX_RETRIES` | Maximum number of retries for failed operations | 3 |
| `TRACKER_USER_AGENT` | User agent string for HTTP requests | Mozilla/5.0 (Windows NT 10.0; Win64; x64)... |

## Usage

### Web Interface (New!)

The REAL ID Appointment Tracker now includes a web-based interface that allows you to configure and manage the tracker through your browser.

#### Features

- Configure email settings including Gmail App Password
- Add recipient emails and phone emails for notifications
- Set check interval
- Start and stop the tracker
- View real-time status information
- Monitor live logs

#### Starting the Web Interface

**Using Docker (Recommended):**

```bash
# On Linux/macOS:
chmod +x web-start.sh web-stop.sh  # Only needed once
./web-start.sh

# On Windows:
web-start.bat
```

The web interface will be available at http://localhost:3000

**Using npm:**

```bash
npm run web
```

#### Stopping the Web Interface

**Using Docker:**

```bash
# On Linux/macOS:
./web-stop.sh

# On Windows:
web-stop.bat
```

**Using keyboard shortcut:**
Press Ctrl+C in the terminal where the web interface is running

#### Cross-Platform Compatibility

The web interface is fully containerized using Docker, ensuring it works consistently across all operating systems including Windows, macOS, and Linux (Ubuntu). When you clone the repository on any system, the Docker setup ensures everything works the same way without system-specific configurations.

### Using npm scripts

```bash
# Start the tracker
npm start

# Run a test check
npm test

# Check tracker status
npm run status

# Show help
npm run help

# Show version
npm run version
```

### Using the Executable Directly

```bash
# Start the tracker
node src/index.js

# Run a test check
node src/index.js test

# Check tracker status
node src/index.js status

# Show help
node src/index.js help

# Show version
node src/index.js version
```

## Project Structure

```
├── src/                  # Source code
│   ├── models/           # Data models
│   │   └── appointment.js # Appointment data model
│   ├── services/         # Core services
│   │   ├── notifier.js   # Notification service
│   │   ├── scheduler.js  # Scheduling service
│   │   └── scraper.js    # Web scraping service
│   ├── utils/            # Utilities
│   │   ├── config.js     # Configuration management
│   │   └── logger.js     # Enhanced logging
│   ├── web/              # Web interface
│   │   ├── public/       # Static web files
│   │   │   ├── index.html # Web interface HTML
│   │   │   ├── styles.css # Styling
│   │   │   └── app.js    # Client-side JavaScript
│   │   ├── server.js     # Web server
│   │   └── index.js      # Web interface entry point
│   ├── app.js            # Core application logic
│   └── index.js          # Command-line interface
├── templates/            # Notification templates
├── data/                 # Data storage
├── debug/                # Debug files
├── .env.example          # Example environment variables
├── docker-compose.yml    # Docker configuration for CLI tracker
├── docker-compose-web.yml # Docker configuration for web interface
├── web-start.sh          # Script to start web interface (Linux/macOS)
├── web-start.bat         # Script to start web interface (Windows)
├── web-stop.sh           # Script to stop web interface (Linux/macOS)
├── web-stop.bat          # Script to stop web interface (Windows)
└── README.md             # Documentation
```

## Email Templates

The application creates a default HTML email template in the `templates/` directory. You can customize this template to change the appearance of notification emails.

Variables in the template:
- `{{locationType}}`: Regular DMV or Mobile Unit
- `{{count}}`: Number of available appointments
- `{{bookingUrl}}`: URL to book an appointment
- `{{timestamp}}`: Date and time when the appointment was found

## Advanced Features

### Debugging Website Parsing Issues

When the application has trouble parsing the website, it automatically saves the HTML content to the `debug/` directory with timestamps and reason codes. This makes it easier to diagnose and fix parsing issues if the website structure changes.

### Appointment History

The application tracks appointment availability history in the `data/` directory. This can be useful to analyze patterns in appointment availability.

### Structured Logging

The enhanced logging system provides detailed logs with timestamps, context information, and log levels. You can adjust the verbosity using the `TRACKER_LOG_LEVEL` environment variable.

## Troubleshooting

- **No notifications received**: Check the log file to see if there were any errors sending emails. Make sure your Gmail app password is correct.
- **Website structure changed**: The application will try multiple parsing strategies and detect structure changes automatically. Check the `debug/` directory for HTML snapshots.
- **Process not stopping**: Press Ctrl+C to stop the process.
- **Log files too large**: The application automatically rotates log files when they reach 10MB.

## License

ISC
