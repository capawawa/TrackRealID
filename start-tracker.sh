#!/bin/bash

# Start the REAL ID Appointment Tracker as a background process
echo "Starting REAL ID Appointment Tracker..."

# Navigate to the script directory
cd "$(dirname "$0")"

# Start the tracker in the background
nohup node src/index.js > tracker-output.log 2>&1 &

# Save the process ID
echo $! > tracker.pid

echo "Tracker started with PID $(cat tracker.pid)"
echo "Logs are being written to tracker.log and tracker-output.log"
echo "To stop the tracker, run: ./stop-tracker.sh"
