@echo off
echo Starting REAL ID Appointment Tracker in Docker...
docker-compose up -d
echo Tracker started in Docker container
echo To view logs, run: docker-compose logs -f
echo To stop the tracker, run: docker-stop.bat
