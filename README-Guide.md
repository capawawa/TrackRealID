# REAL ID Tracker - Complete Guide

This guide consolidates all the different ways to run the REAL ID Appointment Tracker across different operating systems and environments.

## Web Interface (New!)

The REAL ID Appointment Tracker now includes a web-based interface that allows you to configure and manage the tracker through your browser without editing configuration files or using the command line.

### Quick Reference

| Method | Windows | Linux/macOS |
|--------|---------|-------------|
| **Web UI Docker** (Recommended) | `web-start.bat` | `./web-start.sh` |
| **Stop Web UI Docker** | `web-stop.bat` | `./web-stop.sh` |
| **Direct Web UI** | `npm run web` | `npm run web` |

The web interface will be available at http://localhost:3000

### Features

- Configure email settings including Gmail App Password
- Add recipient emails and phone emails for notifications
- Set check interval
- Start and stop the tracker
- View real-time status information and appointment availability
- Monitor live logs

### Cross-Platform Compatibility

The web interface is fully containerized using Docker, ensuring it works consistently across all operating systems including Windows, macOS, and Linux (Ubuntu). When you clone the repository on any system, the Docker setup ensures everything works the same way without system-specific configurations.

## Command Line Options Quick Reference

| Method | Windows | Linux/macOS |
|--------|---------|-------------|
| **Docker** (Recommended) | `.\docker-start.bat` | `./docker-start.sh` |
| **Stop Docker** | `.\docker-stop.bat` | `./docker-stop.sh` |
| **Docker Logs** | `docker-compose logs -f` | `docker-compose logs -f` |
| **Native Scripts** | `powershell -ExecutionPolicy Bypass -File .\start-tracker.ps1` | `./start-tracker.sh` |
| **Stop Native** | `powershell -ExecutionPolicy Bypass -File .\stop-tracker.ps1` | `./stop-tracker.sh` |
| **Check Status** | `.\check-tracker.bat` | `./check-tracker.sh` |
| **Direct Node.js** | `node src/index.js` | `node src/index.js` |
| **Run Test** | `node src/index.js test` | `node src/index.js test` |
| **Unified Management** | N/A | `./tracker.sh [command]` |

## Windows Options

### 1. Docker (Recommended) ⭐

**Prerequisites:** Docker Desktop for Windows installed

This is the recommended approach for most users as it's the most reliable and simplest to manage.

```cmd
# Start the tracker
.\docker-start.bat

# View logs
docker-compose logs -f

# Stop the tracker
.\docker-stop.bat
```

**Advantages:**
- Works consistently with minimal setup
- Automatic restart if it crashes
- No Node.js installation required
- Isolated environment

### 2. PowerShell Scripts

**Prerequisites:** Node.js installed, PowerShell execution policy set to allow scripts

Use this if you prefer to run directly on your Windows machine without Docker.

```powershell
# Start the tracker
powershell -ExecutionPolicy Bypass -File .\start-tracker.ps1

# Check status
.\check-tracker.bat

# Stop the tracker
powershell -ExecutionPolicy Bypass -File .\stop-tracker.ps1
```

**Advantages:**
- No Docker required
- Potentially lower resource usage
- Can customize for Windows-specific features

### 3. Direct Node.js

**Prerequisites:** Node.js installed

The simplest but least robust method. The tracker will only run while the terminal window is open.

```cmd
# Install dependencies first
npm install

# Run the tracker
node src/index.js
```

**Advantages:**
- Simplest approach
- Direct control and visibility
- Useful for development/debugging

## Linux/macOS Options

### 1. Docker (Recommended) ⭐

**Prerequisites:** Docker and Docker Compose installed

This is the recommended approach for most users as it's the most reliable and simplest to manage.

```bash
# Start the tracker
./docker-start.sh

# View logs
docker-compose logs -f

# Stop the tracker
./docker-stop.sh
```

**Advantages:**
- Works consistently with minimal setup
- Automatic restart if it crashes
- No Node.js installation required
- Isolated environment

### 2. Shell Scripts

**Prerequisites:** Node.js installed

Use these scripts to run the tracker as a background process that persists after closing the terminal.

```bash
# Start the tracker
./start-tracker.sh

# Stop the tracker
./stop-tracker.sh
```

**Advantages:**
- No Docker required
- Runs in the background
- Uses native Linux/Unix process management

### 3. Unified Management Script

**Prerequisites:** Node.js installed

A comprehensive script that provides a unified interface to manage the tracker.

```bash
# Make executable (first time only)
chmod +x tracker.sh

# Start the tracker
./tracker.sh start

# Check status
./tracker.sh status

# View logs
./tracker.sh logs

# Stop the tracker
./tracker.sh stop

# Force stop the tracker
./tracker.sh stop -f

# Use Docker instead
./tracker.sh start -d

# Run in verbose mode
./tracker.sh start -v

# Set custom timeout
./tracker.sh stop -t 10

# See all options
./tracker.sh -h
```

**Advantages:**
- All functionality in one convenient script
- Supports both direct and Docker execution
- More monitoring and management features
- Advanced options for timeout, verbose mode, and force operations

### 4. Direct Node.js

**Prerequisites:** Node.js installed

The simplest but least robust method. The tracker will only run while the terminal window is open.

```bash
# Install dependencies first
npm install

# Run the tracker
node src/index.js
```

**Advantages:**
- Simplest approach
- Direct control and visibility
- Useful for development/debugging

## When to Use Each Method

### Use Docker When:
- You want the simplest setup
- You want the tracker to run reliably
- You don't want to install Node.js
- You switch between different operating systems
- You want automatic restarts if it crashes

### Use Native Scripts When:
- Docker isn't available or you prefer not to use it
- You want slightly lower resource usage
- You've already installed Node.js
- You want to run the tracker in the background (Linux/macOS) or as a service (Windows)

### Use Direct Node.js When:
- You're developing or debugging the tracker
- You want to see all console output immediately
- You only need to run the tracker temporarily
- You want the simplest possible approach

### Use the Unified Management Script When:
- You're on Linux/macOS
- You want a convenient all-in-one tool
- You want advanced management features
- You want to easily switch between direct and Docker execution

## Common Tasks

### Testing the Tracker Without Starting It
```bash
# On Windows
node src/index.js test

# On Linux/macOS
node src/index.js test
# OR
./tracker.sh test
```

### Checking If the Tracker Is Running
```bash
# On Windows
.\check-tracker.bat

# On Linux/macOS
./check-tracker.sh
# OR
./tracker.sh status
```

### Viewing Logs
```bash
# Docker (both Windows and Linux/macOS)
docker-compose logs -f

# Windows
.\check-tracker.bat  # Shows latest logs

# Linux/macOS
cat tracker.log
# OR 
./tracker.sh logs
```

### Configuration
All methods use the same configuration from `.env` or environment variables. See main README.md for details.
