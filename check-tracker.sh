#!/bin/bash

# Check if the REAL ID Appointment Tracker is running
echo "Checking for running REAL ID Appointment Tracker instances..."

# Check for any node processes running the tracker
NODE_PROCESSES=$(ps aux | grep "node src/index.js" | grep -v grep)

if [ -n "$NODE_PROCESSES" ]; then
    echo "Found running tracker processes:"
    echo "$NODE_PROCESSES"
    
    # Extract PIDs
    PIDS=$(echo "$NODE_PROCESSES" | awk '{print $2}')
    
    echo "Do you want to kill these processes? (y/n)"
    read -r RESPONSE
    
    if [[ "$RESPONSE" =~ ^[Yy]$ ]]; then
        for PID in $PIDS; do
            echo "Killing process $PID..."
            kill -9 "$PID"
        done
        echo "All tracker processes killed."
    else
        echo "No processes were killed."
    fi
else
    echo "No running tracker processes found."
fi

# Check for any test email processes
TEST_PROCESSES=$(ps aux | grep "node src/test-email.js" | grep -v grep)

if [ -n "$TEST_PROCESSES" ]; then
    echo "Found running test email processes:"
    echo "$TEST_PROCESSES"
    
    # Extract PIDs
    PIDS=$(echo "$TEST_PROCESSES" | awk '{print $2}')
    
    echo "Do you want to kill these processes? (y/n)"
    read -r RESPONSE
    
    if [[ "$RESPONSE" =~ ^[Yy]$ ]]; then
        for PID in $PIDS; do
            echo "Killing process $PID..."
            kill -9 "$PID"
        done
        echo "All test email processes killed."
    else
        echo "No processes were killed."
    fi
else
    echo "No running test email processes found."
fi

echo "Check completed."
