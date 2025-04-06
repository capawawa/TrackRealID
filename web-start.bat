@echo off
REM Start the REAL ID Appointment Tracker Web Interface

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if Docker Compose is installed
where docker-compose >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

echo Starting REAL ID Appointment Tracker Web Interface...
docker-compose -f docker-compose-web.yml up -d

REM Check if the container started successfully
if %ERRORLEVEL% neq 0 (
    echo Failed to start the web interface. Please check the logs.
    exit /b 1
) else (
    echo Web interface started successfully!
    echo You can access it at: http://localhost:3000
)
