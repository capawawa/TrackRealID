# REAL ID Appointment Tracker

A simple Node.js application that monitors the New Jersey MVC websites for REAL ID appointment availability and sends notifications when appointments become available. Can be run directly or using Docker for cross-platform compatibility.

## Features

- Monitors both regular DMV and mobile unit websites for REAL ID appointments
- Checks for appointment availability every 30 minutes (configurable)
- Sends SMS notifications via email-to-text when appointments become available
- Logs all activity to both console and a log file

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
   - Open `src/config.js`
   - Add your Gmail app password (see below for instructions)
   - Adjust other settings as needed

### Option 2: Docker Installation
2. Configure the application:
   - Open `src/config.js`
   - Add your Gmail app password (see below for instructions)
   - Adjust other settings as needed
   
3. No need to install dependencies - Docker will handle this automatically

## Gmail App Password Setup

To send email notifications, you need to generate an "App Password" for your Gmail account:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Select "Security"
3. Under "Signing in to Google," select "2-Step Verification" (you must have this enabled)
4. At the bottom of the page, select "App passwords"
5. Generate a new app password for "Mail" and "Other (Custom name)" - name it "REAL ID Tracker"
6. Copy the 16-character password
7. Paste it into the `password` field in `src/config.js`

## Usage

There are three ways to start the tracker:

### Method 1: Direct start (stays running in terminal)

```bash
npm start
```

### Method 2: Background process (continues running after terminal is closed)

```bash
./start-tracker.sh
```

### Method 3: Docker container (cross-platform, runs in background)

```bash
./docker-start.sh
```

The tracker will:
1. Run an initial check immediately
2. Schedule recurring checks every 30 minutes
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
```

### Updating the Docker Container

If you make changes to the code and need to rebuild the Docker container:

```bash
docker-compose build
docker-compose up -d
```

## Troubleshooting

- **No notifications received**: Check the log file to see if there were any errors sending emails. Make sure your Gmail app password is correct.
- **Website structure changed**: If the NJ MVC changes their website structure, the tracker may need to be updated to match the new HTML structure.

## License

ISC
