#!/bin/bash

# Start the REAL ID Appointment Tracker as a background process
echo "Starting REAL ID Appointment Tracker..."

# Navigate to the script directory
cd "$(dirname "$0")"

# Check if the tracker is already running
if [ -f "tracker.pid" ]; then
    PID=$(cat tracker.pid)
    if ps -p $PID > /dev/null; then
        echo "Tracker is already running with PID $PID"
        echo "To stop the tracker, run: ./stop-tracker.sh"
        echo "To restart the tracker, run: ./stop-tracker.sh && ./start-tracker.sh"
        exit 1
    else
        echo "Found stale PID file. Removing..."
        rm tracker.pid
    fi
fi

# Check for any other running instances
RUNNING_INSTANCES=$(ps aux | grep "node src/index.js" | grep -v grep | wc -l)
if [ $RUNNING_INSTANCES -gt 0 ]; then
    echo "WARNING: Found $RUNNING_INSTANCES running tracker instances."
    echo "Please stop all instances first with: ./stop-tracker.sh"
    echo "Or use: ./check-tracker.sh to find and kill all running instances."
    exit 1
fi

# Start the tracker in the background
nohup node src/index.js > tracker-output.log 2>&1 &

# Save the process ID
echo $! > tracker.pid

echo "Tracker started with PID $(cat tracker.pid)"
echo "Logs are being written to tracker.log and tracker-output.log"
echo "To stop the tracker, run: ./stop-tracker.sh"
