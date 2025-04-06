#!/bin/bash
# Stop the REAL ID Appointment Tracker Web Interface

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "Stopping REAL ID Appointment Tracker Web Interface..."
docker-compose -f docker-compose-web.yml down

# Check if the container stopped successfully
if [ $? -eq 0 ]; then
    echo "Web interface stopped successfully!"
else
    echo "Failed to stop the web interface. Please check the logs."
    exit 1
fi
