@echo off
REM Stop the REAL ID Appointment Tracker Web Interface

REM Check if Docker Compose is installed
where docker-compose >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

echo Stopping REAL ID Appointment Tracker Web Interface...
docker-compose -f docker-compose-web.yml down

REM Check if the container stopped successfully
if %ERRORLEVEL% neq 0 (
    echo Failed to stop the web interface. Please check the logs.
    exit /b 1
) else (
    echo Web interface stopped successfully!
)
