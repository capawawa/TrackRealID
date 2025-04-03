#!/bin/bash

# REAL ID Appointment Tracker Management Script
# A unified script for starting, stopping, and checking the status of the tracker

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
DOCKER=false

# Function to display usage information
usage() {
    echo -e "${BLUE}REAL ID Appointment Tracker Management Script${NC}"
    echo
    echo -e "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  start         Start the tracker"
    echo "  stop          Stop the tracker"
    echo "  restart       Restart the tracker"
    echo "  status        Check if the tracker is running"
    echo "  test          Run a single test check without starting the tracker"
    echo "  logs          View the tracker logs"
    echo
    echo "Options:"
    echo "  -f, --force       Force operation without confirmation"
    echo "  -t, --timeout N   Wait N seconds before force killing (default: 5)"
    echo "  -v, --verbose     Display detailed output"
    echo "  -d, --docker      Use Docker for operations"
    echo "  --no-log          Don't log operations to tracker log"
    echo "  -h, --help        Display this help message"
    echo
    echo "Examples:"
    echo "  $0 start          Start the tracker"
    echo "  $0 stop           Stop the tracker"
    echo "  $0 status         Check if the tracker is running"
    echo "  $0 start -d       Start the tracker using Docker"
    echo "  $0 stop -f        Force stop the tracker"
    echo "  $0 logs           View the tracker logs"
    exit 1
}

# Parse command line arguments
COMMAND=""
if [ $# -gt 0 ]; then
    COMMAND="$1"
    shift
fi

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
        -d|--docker)
            DOCKER=true
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

# Function to check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_message "${RED}Error: Docker is not installed or not in PATH${NC}"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_message "${RED}Error: docker-compose is not installed or not in PATH${NC}"
        return 1
    fi
    
    return 0
}

# Function to start the tracker
start_tracker() {
    log_message "${BLUE}Starting REAL ID Appointment Tracker...${NC}"
    
    if [ "$DOCKER" = true ]; then
        # Check if Docker is available
        if ! check_docker; then
            return 1
        fi
        
        # Start with Docker
        if [ -f "docker-compose.yml" ]; then
            docker-compose up -d
            log_message "${GREEN}Tracker started in Docker container${NC}"
            log_message "To view logs, run: $0 logs -d"
        else
            log_message "${RED}Error: docker-compose.yml not found${NC}"
            return 1
        fi
    else
        # Check if the tracker is already running
        if [ -f "tracker.pid" ]; then
            PID=$(cat tracker.pid)
            if is_process_running $PID; then
                log_message "${YELLOW}Tracker is already running with PID $PID${NC}"
                log_message "To stop the tracker, run: $0 stop"
                log_message "To restart the tracker, run: $0 restart"
                return 1
            else
                log_message "${YELLOW}Found stale PID file. Removing...${NC}"
                rm tracker.pid
            fi
        fi
        
        # Check for any other running instances
        RUNNING_INSTANCES=$(ps aux | grep "node src/index.js" | grep -v grep | wc -l)
        if [ $RUNNING_INSTANCES -gt 0 ]; then
            log_message "${YELLOW}WARNING: Found $RUNNING_INSTANCES running tracker instances.${NC}"
            log_message "${YELLOW}Please stop all instances first with: $0 stop${NC}"
            log_message "${YELLOW}Or use: $0 status to find and kill all running instances.${NC}"
            return 1
        fi
        
        # Start the tracker in the background
        nohup node src/index.js > tracker-output.log 2>&1 &
        
        # Save the process ID
        echo $! > tracker.pid
        
        log_message "${GREEN}Tracker started with PID $(cat tracker.pid)${NC}"
        log_message "Logs are being written to tracker.log and tracker-output.log"
        log_message "To stop the tracker, run: $0 stop"
    fi
    
    return 0
}

# Function to stop the tracker
stop_tracker() {
    log_message "${BLUE}Stopping REAL ID Appointment Tracker...${NC}"
    
    if [ "$DOCKER" = true ]; then
        # Check if Docker is available
        if ! check_docker; then
            return 1
        fi
        
        # Stop with Docker
        if [ -f "docker-compose.yml" ]; then
            docker-compose down
            log_message "${GREEN}Tracker container stopped${NC}"
        else
            log_message "${RED}Error: docker-compose.yml not found${NC}"
            return 1
        fi
    else
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
                            return 1
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
                        return 1
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
        
        # Check for any test processes
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
    fi
    
    log_message "${GREEN}Tracker shutdown complete${NC}"
    return 0
}

# Function to check the status of the tracker
check_status() {
    log_message "${BLUE}Checking REAL ID Appointment Tracker status...${NC}"
    
    if [ "$DOCKER" = true ]; then
        # Check if Docker is available
        if ! check_docker; then
            return 1
        fi
        
        # Check Docker status
        CONTAINER_STATUS=$(docker-compose ps | grep real-id-tracker)
        if [ -n "$CONTAINER_STATUS" ]; then
            log_message "${GREEN}Tracker is running in Docker:${NC}"
            log_message "$CONTAINER_STATUS"
        else
            log_message "${YELLOW}Tracker is not running in Docker${NC}"
        fi
    else
        # Check if PID file exists
        if [ -f "tracker.pid" ]; then
            PID=$(cat tracker.pid)
            
            # Check if the process is still running
            if is_process_running $PID; then
                log_message "${GREEN}Tracker is running with PID $PID${NC}"
                
                # Show process details
                if [ "$VERBOSE" = true ]; then
                    PROCESS_INFO=$(ps -p $PID -o pid,ppid,cmd,etime,rss,vsz | grep -v PID)
                    log_message "Process details:"
                    log_message "$PROCESS_INFO"
                    
                    # Show memory usage
                    RSS=$(echo "$PROCESS_INFO" | awk '{print $5}')
                    VSZ=$(echo "$PROCESS_INFO" | awk '{print $6}')
                    log_message "Memory usage: RSS=${RSS}KB, VSZ=${VSZ}KB"
                    
                    # Show uptime
                    UPTIME=$(echo "$PROCESS_INFO" | awk '{print $4}')
                    log_message "Uptime: $UPTIME"
                }
            else
                log_message "${YELLOW}Tracker process is not running (PID: $PID)${NC}"
                log_message "${YELLOW}Found stale PID file. You may want to remove it.${NC}"
            fi
        else
            log_message "${YELLOW}No tracker PID file found.${NC}"
        fi
        
        # Check for any other running instances
        RUNNING_INSTANCES=$(ps aux | grep "node src/index.js" | grep -v grep)
        if [ -n "$RUNNING_INSTANCES" ]; then
            log_message "${BLUE}Found running tracker instances:${NC}"
            log_message "$RUNNING_INSTANCES"
            
            # Count instances
            INSTANCE_COUNT=$(echo "$RUNNING_INSTANCES" | wc -l)
            log_message "Total running instances: $INSTANCE_COUNT"
        else
            log_message "${YELLOW}No running tracker instances found.${NC}"
        fi
        
        # Check for any test processes
        TEST_PROCESSES=$(ps aux | grep "node src/test.js" | grep -v grep)
        if [ -n "$TEST_PROCESSES" ]; then
            log_message "${BLUE}Found running test processes:${NC}"
            log_message "$TEST_PROCESSES"
        fi
    fi
    
    # Check log file
    if [ -f "tracker.log" ]; then
        LOG_SIZE=$(du -h tracker.log | cut -f1)
        LOG_LINES=$(wc -l tracker.log | cut -d' ' -f1)
        LAST_ENTRY=$(tail -n 1 tracker.log)
        
        log_message "${BLUE}Log file information:${NC}"
        log_message "Size: $LOG_SIZE, Lines: $LOG_LINES"
        log_message "Last log entry: $LAST_ENTRY"
    else
        log_message "${YELLOW}No log file found.${NC}"
    fi
    
    log_message "${GREEN}Status check complete${NC}"
    return 0
}

# Function to run a test check
run_test() {
    log_message "${BLUE}Running a test check...${NC}"
    
    if [ "$DOCKER" = true ]; then
        # Check if Docker is available
        if ! check_docker; then
            return 1
        fi
        
        # Run test in Docker
        if [ -f "docker-compose.yml" ]; then
            docker-compose run --rm real-id-tracker node src/test.js
        else
            log_message "${RED}Error: docker-compose.yml not found${NC}"
            return 1
        fi
    else
        # Run test directly
        node src/test.js
    fi
    
    log_message "${GREEN}Test completed${NC}"
    return 0
}

# Function to view logs
view_logs() {
    if [ "$DOCKER" = true ]; then
        # Check if Docker is available
        if ! check_docker; then
            return 1
        fi
        
        # View Docker logs
        if [ -f "docker-compose.yml" ]; then
            docker-compose logs
        else
            log_message "${RED}Error: docker-compose.yml not found${NC}"
            return 1
        fi
    else
        # View local logs
        if [ -f "tracker.log" ]; then
            # Use less if available, otherwise cat
            if command -v less &> /dev/null; then
                less tracker.log
            else
                cat tracker.log
            fi
        else
            log_message "${YELLOW}No log file found.${NC}"
            return 1
        fi
    fi
    
    return 0
}

# Navigate to the script directory
cd "$(dirname "$0")"

# Execute the requested command
case "$COMMAND" in
    start)
        start_tracker
        ;;
    stop)
        stop_tracker
        ;;
    restart)
        stop_tracker
        sleep 2
        start_tracker
        ;;
    status)
        check_status
        ;;
    test)
        run_test
        ;;
    logs)
        view_logs
        ;;
    "")
        log_message "${RED}Error: No command specified${NC}"
        usage
        ;;
    *)
        log_message "${RED}Error: Unknown command $COMMAND${NC}"
        usage
        ;;
esac

exit $?
