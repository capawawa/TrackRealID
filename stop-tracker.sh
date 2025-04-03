#!/bin/bash

# Stop the REAL ID Appointment Tracker
echo "Stopping REAL ID Appointment Tracker..."

# Navigate to the script directory
cd "$(dirname "$0")"

# Check if PID file exists
if [ -f "tracker.pid" ]; then
    PID=$(cat tracker.pid)
    
    # Check if the process is still running
    if ps -p $PID > /dev/null; then
        echo "Stopping tracker process with PID $PID"
        kill $PID
        
        # Wait for the process to terminate
        sleep 2
        
        # Check if it's still running
        if ps -p $PID > /dev/null; then
            echo "Process didn't terminate gracefully, forcing..."
            kill -9 $PID
        fi
        
        echo "Tracker stopped"
    else
        echo "Tracker process is not running (PID: $PID)"
    fi
    
    # Remove the PID file
    rm tracker.pid
else
    echo "No tracker PID file found. Tracker may not be running."
fi

# Check for any other running instances
RUNNING_INSTANCES=$(ps aux | grep "node src/index.js" | grep -v grep)
if [ -n "$RUNNING_INSTANCES" ]; then
    echo "Found additional running tracker instances:"
    echo "$RUNNING_INSTANCES"
    
    # Extract PIDs
    PIDS=$(echo "$RUNNING_INSTANCES" | awk '{print $2}')
    
    echo "Stopping all instances..."
    for PID in $PIDS; do
        echo "Stopping process $PID..."
        kill $PID
        
        # Wait for the process to terminate
        sleep 1
        
        # Check if it's still running
        if ps -p $PID > /dev/null; then
            echo "Process didn't terminate gracefully, forcing..."
            kill -9 $PID
        fi
    done
    
    echo "All tracker instances stopped"
fi

echo "Tracker shutdown complete"
