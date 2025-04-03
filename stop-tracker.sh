#!/bin/bash

# Stop the REAL ID Appointment Tracker
# Improved version with better error handling, timeout options, and more informative messages

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default settings
TIMEOUT=5
FORCE=false
VERBOSE=false
LOG_TO_FILE=true

# Function to display usage information
usage() {
    echo -e "${BLUE}Usage: $0 [OPTIONS]${NC}"
    echo "Options:"
    echo "  -f, --force       Force kill without waiting for graceful shutdown"
    echo "  -t, --timeout N   Wait N seconds before force killing (default: 5)"
    echo "  -v, --verbose     Display detailed output"
    echo "  --no-log          Don't log stop operations to tracker log"
    echo "  -h, --help        Display this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --no-log)
            LOG_TO_FILE=false
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            usage
            ;;
    esac
done

# Function to log messages
log_message() {
    local message="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Always print to console
    echo -e "$message"
    
    # Log to file if enabled
    if [ "$LOG_TO_FILE" = true ] && [ -f "tracker.log" ]; then
        echo "[$timestamp] $message" | sed 's/\x1B\[[0-9;]\{1,\}[A-Za-z]//g' >> tracker.log
    fi
}

# Function to check if a process is running
is_process_running() {
    local pid=$1
    if ps -p $pid > /dev/null; then
        return 0 # Process is running
    else
        return 1 # Process is not running
    fi
}

# Function to check for Docker instances
check_docker_instances() {
    if command -v docker &> /dev/null && docker ps | grep -q "real-id-tracker"; then
        log_message "${YELLOW}Warning: Found Docker container running the tracker.${NC}"
        log_message "${YELLOW}To stop the Docker container, use: ./docker-stop.sh${NC}"
        
        if [ "$FORCE" = true ]; then
            log_message "${YELLOW}Force flag set, attempting to stop Docker container...${NC}"
            if [ -f "./docker-stop.sh" ] && [ -x "./docker-stop.sh" ]; then
                ./docker-stop.sh
                log_message "${GREEN}Docker container stopped.${NC}"
            else
                log_message "${RED}Could not find or execute docker-stop.sh${NC}"
                return 1
            fi
        else
            return 1
        fi
    fi
    return 0
}

# Navigate to the script directory
cd "$(dirname "$0")"

log_message "${BLUE}Stopping REAL ID Appointment Tracker...${NC}"

# Check for Docker instances
check_docker_instances

# Check if PID file exists
if [ -f "tracker.pid" ]; then
    PID=$(cat tracker.pid)
    
    # Check if the process is still running
    if is_process_running $PID; then
        log_message "${BLUE}Found tracker process with PID $PID${NC}"
        
        # Kill the process
        log_message "Sending termination signal to process $PID"
        kill $PID
        
        # Wait for the process to terminate
        if [ "$FORCE" = false ]; then
            log_message "Waiting up to $TIMEOUT seconds for graceful shutdown..."
            
            # Loop until process ends or timeout
            for ((i=1; i<=$TIMEOUT; i++)); do
                if ! is_process_running $PID; then
                    log_message "${GREEN}Process terminated gracefully.${NC}"
                    break
                fi
                
                if [ "$VERBOSE" = true ]; then
                    log_message "Still waiting... ($i/$TIMEOUT seconds)"
                fi
                
                sleep 1
            done
            
            # Check if it's still running after timeout
            if is_process_running $PID; then
                log_message "${YELLOW}Process didn't terminate gracefully within $TIMEOUT seconds, forcing...${NC}"
                kill -9 $PID
                
                # Verify it's gone
                if ! is_process_running $PID; then
                    log_message "${GREEN}Process forcefully terminated.${NC}"
                else
                    log_message "${RED}Failed to terminate process $PID. Try manually with: kill -9 $PID${NC}"
                    exit 1
                fi
            fi
        else
            # Force kill immediately
            log_message "${YELLOW}Force flag set, skipping graceful shutdown...${NC}"
            kill -9 $PID
            
            # Verify it's gone
            if ! is_process_running $PID; then
                log_message "${GREEN}Process forcefully terminated.${NC}"
            else
                log_message "${RED}Failed to terminate process $PID. Try manually with: kill -9 $PID${NC}"
                exit 1
            fi
        fi
    else
        log_message "${YELLOW}Tracker process is not running (PID: $PID)${NC}"
    fi
    
    # Remove the PID file
    rm tracker.pid
    log_message "Removed PID file"
else
    log_message "${YELLOW}No tracker PID file found. Tracker may not be running.${NC}"
fi

# Check for any other running instances
RUNNING_INSTANCES=$(ps aux | grep "node src/index.js" | grep -v grep)
if [ -n "$RUNNING_INSTANCES" ]; then
    log_message "${YELLOW}Found additional running tracker instances:${NC}"
    log_message "$RUNNING_INSTANCES"
    
    # Extract PIDs
    PIDS=$(echo "$RUNNING_INSTANCES" | awk '{print $2}')
    
    log_message "Stopping all instances..."
    for PID in $PIDS; do
        log_message "Stopping process $PID..."
        kill $PID
        
        # Wait for the process to terminate if not in force mode
        if [ "$FORCE" = false ]; then
            for ((i=1; i<=$TIMEOUT; i++)); do
                if ! is_process_running $PID; then
                    log_message "${GREEN}Process $PID terminated gracefully.${NC}"
                    break
                fi
                
                if [ "$VERBOSE" = true ]; then
                    log_message "Still waiting... ($i/$TIMEOUT seconds)"
                fi
                
                sleep 1
            done
            
            # Check if it's still running after timeout
            if is_process_running $PID; then
                log_message "${YELLOW}Process $PID didn't terminate gracefully, forcing...${NC}"
                kill -9 $PID
            fi
        else
            # Force kill immediately
            kill -9 $PID
            log_message "Process $PID forcefully terminated."
        fi
    done
    
    log_message "${GREEN}All tracker instances stopped${NC}"
fi

# Check for any test email processes
TEST_PROCESSES=$(ps aux | grep "node src/test.js" | grep -v grep)
if [ -n "$TEST_PROCESSES" ]; then
    log_message "${YELLOW}Found running test processes:${NC}"
    log_message "$TEST_PROCESSES"
    
    # Extract PIDs
    PIDS=$(echo "$TEST_PROCESSES" | awk '{print $2}')
    
    log_message "Stopping all test processes..."
    for PID in $PIDS; do
        log_message "Stopping test process $PID..."
        kill -9 $PID
        log_message "Test process $PID terminated."
    done
fi

log_message "${GREEN}Tracker shutdown complete${NC}"
exit 0
