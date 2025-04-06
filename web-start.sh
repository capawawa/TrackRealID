#!/bin/bash
# Start the REAL ID Appointment Tracker Web Interface

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "Starting REAL ID Appointment Tracker Web Interface..."
docker-compose -f docker-compose-web.yml up -d

# Check if the container started successfully
if [ $? -eq 0 ]; then
    echo "Web interface started successfully!"
    echo "You can access it at: http://localhost:3000"
else
    echo "Failed to start the web interface. Please check the logs."
    exit 1
fi
