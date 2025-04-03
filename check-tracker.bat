@echo off
echo Checking REAL ID Appointment Tracker status...
echo.

:: Check for running jobs via PowerShell
echo Checking for PowerShell jobs...
powershell -Command "Get-Job | Where-Object { $_.Name -like '*tracker*' -or $_.Command -like '*tracker*' } | Format-Table Id, Name, State"

:: Check if PID file exists
if exist tracker.pid (
    set /p TRACKER_PID=<tracker.pid
    
    if defined TRACKER_PID (
        echo Found tracker PID file with PID: %TRACKER_PID%
        
        :: Check if process is running using PowerShell (more reliable)
        powershell -Command "if (Get-Process -Id %TRACKER_PID% -ErrorAction SilentlyContinue) { Write-Host 'Tracker is running with PID %TRACKER_PID%' } else { Write-Host 'PID file exists but process is not running' }"
    ) else (
        echo PID file exists but is empty or contains invalid data
        echo Consider removing the file with: del tracker.pid
    )
) else (
    echo No tracker PID file found.
)

:: Check for any running node processes
echo.
echo Checking for running node processes...
powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object Id, CPU, StartTime, @{Name='RunningTime';Expression={(Get-Date) - $_.StartTime}}, @{Name='CommandLine';Expression={$_.CommandLine}} | Format-Table"

:: Check log file
echo.
if exist tracker.log (
    echo Log file exists: tracker.log
    echo Last 10 log entries:
    echo ----------------------------------------
    powershell -Command "Get-Content -Path tracker.log -Tail 10"
    echo ----------------------------------------
    echo.
    echo Full logs can be viewed in tracker.log
) else (
    echo No log file found (tracker.log)
)

:: Check for output log
if exist tracker-output.log (
    echo Output log file exists: tracker-output.log
    echo Last few output entries:
    echo ----------------------------------------
    powershell -Command "Get-Content -Path tracker-output.log -Tail 5"
    echo ----------------------------------------
    echo.
) else (
    echo No output log file found (tracker-output.log)
)

:: Check configuration
echo.
echo Configuration:
if exist .env (
    echo Found .env file with custom configuration
) else (
    echo No .env file found, using default configuration
)

echo.
echo Tracker start command: powershell -ExecutionPolicy Bypass -File .\start-tracker.ps1
echo Tracker stop command:  powershell -ExecutionPolicy Bypass -File .\stop-tracker.ps1
echo.