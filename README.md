# REAL ID Appointment Tracker

A Node.js application that monitors the New Jersey MVC websites for REAL ID appointment availability and sends notifications when appointments become available. Can be run directly or using Docker for cross-platform compatibility.

> **New to this project?** Check out the [Complete Guide](README-Guide.md) for a comparison of all the different ways to run this tracker on Windows, Linux, and macOS.

## Features

- Monitors both regular DMV and mobile unit websites for REAL ID appointments
- Checks for appointment availability every 10 minutes (configurable)
- Sends SMS notifications via email-to-text when appointments become available
- Logs all activity to both console and a log file
- Robust error handling with retry mechanism and exponential backoff
- Unified management script for easy control
- Environment variable support for secure credential management
- Docker support for cross-platform compatibility

## Prerequisites

### Option 1: Direct Installation
- Node.js (v12 or higher)
- npm (comes with Node.js)
- A Gmail account to send notifications from

### Option 2: Docker Installation
- Docker and Docker Compose
- A Gmail account to send notifications from

## Installation

1. Clone or download this repository

### Option 1: Direct Installation
2. Install dependencies:

```bash
npm install
```

3. Configure the application:
   - Copy `.env.example` to `.env` and edit the values
   - Or edit `src/config.js` directly (not recommended for sensitive information)

### Option 2: Docker Installation
2. Configure the application:
   - Copy `.env.example` to `.env` and edit the values
   - Uncomment the `env_file` section in `docker-compose.yml` if you prefer to use the .env file directly
   
3. No need to install dependencies - Docker will handle this automatically

## Gmail App Password Setup

To send email notifications, you need to generate an "App Password" for your Gmail account:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Select "Security"
3. Under "Signing in to Google," select "2-Step Verification" (you must have this enabled)
4. At the bottom of the page, select "App passwords"
5. Generate a new app password for "Mail" and "Other (Custom name)" - name it "REAL ID Tracker"
6. Copy the 16-character password
7. Add it to your `.env` file as `TRACKER_EMAIL_PASSWORD`

## Usage

There are multiple ways to start, stop, and manage the tracker:

### Using the Unified Management Script

The `tracker.sh` script provides a unified interface for managing the tracker:

```bash
# Make the script executable (first time only)
chmod +x tracker.sh

# Start the tracker
./tracker.sh start

# Stop the tracker
./tracker.sh stop

# Restart the tracker
./tracker.sh restart

# Check the status of the tracker
./tracker.sh status

# Run a single test check without starting the tracker
./tracker.sh test

# View the tracker logs
./tracker.sh logs

# Use Docker instead of direct execution
./tracker.sh start -d
./tracker.sh stop -d
./tracker.sh status -d

# Get help and see all available options
./tracker.sh -h
```

### Traditional Methods

#### Method 1: Direct start (stays running in terminal)

```bash
npm start
```

#### Method 2: Background process (continues running after terminal is closed)

```bash
./start-tracker.sh
```

#### Method 3: Docker container (cross-platform, runs in background)

```bash
./docker-start.sh
```

The tracker will:
1. Run an initial check immediately
2. Schedule recurring checks every 10 minutes (configurable)
3. Log all activity to both the console and `tracker.log`
4. Send notifications when appointments become available

## Stopping the Tracker

If started with `npm start`, press `Ctrl+C` in the terminal where it's running.

If started with `start-tracker.sh`, use:

```bash
./stop-tracker.sh
```

If started with Docker, use:

```bash
./docker-stop.sh
```

## Environment Variables

The application supports the following environment variables:

```
# URLs to check for appointments
TRACKER_REGULAR_URL=https://telegov.njportal.com/njmvc/AppointmentWizard
TRACKER_MOBILE_URL=https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard

# URLs to send in notifications
TRACKER_REGULAR_NOTIFICATION_URL=https://telegov.njportal.com/njmvc/AppointmentWizard/12
TRACKER_MOBILE_NOTIFICATION_URL=https://telegov.njportal.com/njmvcmobileunit/AppointmentWizard

# Check interval in minutes
TRACKER_CHECK_INTERVAL=10

# Email configuration
TRACKER_EMAIL_SENDER=your.email@gmail.com
TRACKER_EMAIL_RECIPIENT=your.phone@vtext.com
TRACKER_EMAIL_PASSWORD=your-app-password
TRACKER_EMAIL_SUBJECT=REAL ID Appointment Available!

# Logging
TRACKER_LOG_FILE=tracker.log
```

## Docker Usage

The Docker setup provides several advantages:
- Works consistently across different operating systems (Windows, macOS, Linux)
- Automatically restarts if the container crashes
- No need to install Node.js on your system
- Logs and configuration are accessible from the host system

### Viewing Docker Logs

To see the live logs from the Docker container:

```bash
docker-compose logs -f
# or
./tracker.sh logs -d
```

### Updating the Docker Container

If you make changes to the code and need to rebuild the Docker container:

```bash
docker-compose build
docker-compose up -d
```

## Advanced Features

### Error Handling and Reliability

The tracker includes robust error handling:
- Retry mechanism for failed website checks
- Exponential backoff for repeated failures
- Detailed error logging with different severity levels
- HTML debugging for parsing failures
- Graceful shutdown handling

### Configuration Validation

The application validates its configuration on startup and provides helpful error messages if any required settings are missing.

## Troubleshooting

- **No notifications received**: Check the log file to see if there were any errors sending emails. Make sure your Gmail app password is correct.
- **Website structure changed**: If the NJ MVC changes their website structure, the tracker may need to be updated to match the new HTML structure. HTML debugging files will be saved automatically if parsing fails.
- **Process not stopping**: Use the force option to kill the process: `./tracker.sh stop -f`
- **Multiple instances running**: Use `./tracker.sh status` to see all running instances and `./tracker.sh stop` to stop them all.

## License

ISC