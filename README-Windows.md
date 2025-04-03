# REAL ID Appointment Tracker - Windows Setup

This document provides instructions for running the REAL ID Appointment Tracker on Windows.

## Running with Docker (Recommended)

The easiest way to run the tracker on Windows is using Docker, which was already set up in the original project.

### Prerequisites
- Docker Desktop for Windows installed
- Docker Compose installed

### Steps

1. Configure your `.env` file with your email credentials:
   ```
   # Email configuration is already updated with your information
   TRACKER_EMAIL_SENDER=adamb.capuana@gmail.com
   TRACKER_EMAIL_RECIPIENT=7329957580@vtext.com
   TRACKER_EMAIL_PASSWORD=zczq xbiu hbrg wved
   ```

2. Start the tracker using:
   ```
   docker-start.bat
   ```

3. View the logs:
   ```
   docker-compose logs -f
   ```

4. Stop the tracker:
   ```
   docker-stop.bat
   ```

## Alternative: Running Directly on Windows

If you prefer to run the tracker directly on Windows without Docker, you can use the PowerShell scripts.

### Prerequisites

- Node.js installed on your Windows machine
- PowerShell execution policy that allows running scripts (recommended: RemoteSigned)

### Steps

1. Install dependencies:
   ```
   npm install
   ```

2. Start the tracker:
   ```
   powershell -ExecutionPolicy Bypass -File .\start-tracker.ps1
   ```

3. Check tracker status:
   ```
   .\check-tracker.bat
   ```

4. Stop the tracker:
   ```
   powershell -ExecutionPolicy Bypass -File .\stop-tracker.ps1
   ```

## Configuration

All configuration settings are in the `.env` file:

- `TRACKER_CHECK_INTERVAL`: How often to check for appointments (in minutes)
- `TRACKER_EMAIL_SENDER`: Gmail address to send notifications from (already set to adamb.capuana@gmail.com)
- `TRACKER_EMAIL_RECIPIENT`: Email address to receive notifications (already set to 7329957580@vtext.com)
- `TRACKER_EMAIL_PASSWORD`: Google App Password for the Gmail account (already set)

## Troubleshooting

### Docker Issues
- If Docker doesn't start properly, check that Docker Desktop is running
- View Docker logs with `docker-compose logs -f` to see if there are any errors

### Direct Run Issues
- If running directly on Windows, use `.\check-tracker.bat` to view the status and logs
- Check for Node.js version compatibility if you encounter any JavaScript errors