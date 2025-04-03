# Stop the REAL ID Appointment Tracker
# PowerShell equivalent of stop-tracker.sh

# Parse command line arguments
param(
    [switch]$f,
    [switch]$force,
    [int]$t = 5,
    [int]$timeout = 5,
    [switch]$v,
    [switch]$verbose,
    [switch]$NoLog,
    [switch]$h,
    [switch]$help
)

# Default settings
$TIMEOUT = 5
$FORCE = $false
$VERBOSE = $false
$LOG_TO_FILE = $true

# Set variables based on parameters
if ($f -or $force) { $FORCE = $true }
if ($t -ne 5) { $TIMEOUT = $t }
if ($timeout -ne 5) { $TIMEOUT = $timeout }
if ($v -or $verbose) { $VERBOSE = $true }
if ($NoLog) { $LOG_TO_FILE = $false }
if ($h -or $help) {
    Write-Host "Usage: $PSCommandPath [OPTIONS]"
    Write-Host "Options:"
    Write-Host "  -f, -force       Force kill without waiting for graceful shutdown"
    Write-Host "  -t, -timeout N   Wait N seconds before force killing (default: 5)"
    Write-Host "  -v, -verbose     Display detailed output"
    Write-Host "  -NoLog           Don't log stop operations to tracker log"
    Write-Host "  -h, -help        Display this help message"
    exit 1
}

# Function to log messages
function Log-Message {
    param(
        [string]$message
    )
    
    # Always print to console
    Write-Host $message
    
    # Log to file if enabled
    if ($LOG_TO_FILE -and (Test-Path "tracker.log")) {
        $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        "[$timestamp] $message" | Out-File -Append -FilePath "tracker.log"
    }
}

# Function to check if a process is running
function Is-ProcessRunning {
    param(
        [int]$processId
    )
    
    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

Log-Message "Stopping REAL ID Appointment Tracker..."

# Check if job script exists and remove it
if (Test-Path "tracker-job.ps1") {
    Log-Message "Removing tracker job script"
    Remove-Item "tracker-job.ps1" -ErrorAction SilentlyContinue
}

# Check for running jobs
$runningJobs = Get-Job | Where-Object { $_.Name -like "*tracker*" -or $_.Command -like "*tracker*" }
if ($runningJobs) {
    Log-Message "Found running tracker jobs. Stopping..."
    foreach ($job in $runningJobs) {
        Log-Message "Stopping job ID: $($job.Id)"
        Stop-Job -Id $job.Id -ErrorAction SilentlyContinue
        Remove-Job -Id $job.Id -Force -ErrorAction SilentlyContinue
    }
    Log-Message "All tracker jobs stopped"
}

# Check if PID file exists
if (Test-Path "tracker.pid") {
    $PID_OR_JOB_ID = Get-Content "tracker.pid"
    
    # Try to interpret as process ID
    try {
        $PID_NUM = [int]$PID_OR_JOB_ID
        
        # Check if the process is still running
        if (Is-ProcessRunning -processId $PID_NUM) {
            Log-Message "Found tracker process with PID $PID_NUM"
            
            # Kill the process
            Log-Message "Sending termination signal to process $PID_NUM"
            Stop-Process -Id $PID_NUM -ErrorAction SilentlyContinue
            
            # Wait for the process to terminate
            if (-not $FORCE) {
                Log-Message "Waiting up to $TIMEOUT seconds for graceful shutdown..."
                
                # Loop until process ends or timeout
                for ($i = 1; $i -le $TIMEOUT; $i++) {
                    if (-not (Is-ProcessRunning -processId $PID_NUM)) {
                        Log-Message "Process terminated gracefully."
                        break
                    }
                    
                    if ($VERBOSE) {
                        Log-Message "Still waiting... ($i/$TIMEOUT seconds)"
                    }
                    
                    Start-Sleep -Seconds 1
                }
                
                # Check if it's still running after timeout
                if (Is-ProcessRunning -processId $PID_NUM) {
                    Log-Message "Process didn't terminate gracefully within $TIMEOUT seconds, forcing..."
                    Stop-Process -Id $PID_NUM -Force -ErrorAction SilentlyContinue
                    
                    # Verify it's gone
                    if (-not (Is-ProcessRunning -processId $PID_NUM)) {
                        Log-Message "Process forcefully terminated."
                    }
                    else {
                        Log-Message "Failed to terminate process $PID_NUM. Try manually with: Stop-Process -Id $PID_NUM -Force"
                        exit 1
                    }
                }
            }
            else {
                # Force kill immediately
                Log-Message "Force flag set, skipping graceful shutdown..."
                Stop-Process -Id $PID_NUM -Force -ErrorAction SilentlyContinue
                
                # Verify it's gone
                if (-not (Is-ProcessRunning -processId $PID_NUM)) {
                    Log-Message "Process forcefully terminated."
                }
                else {
                    Log-Message "Failed to terminate process $PID_NUM. Try manually with: Stop-Process -Id $PID_NUM -Force"
                    exit 1
                }
            }
        }
        else {
            Log-Message "Tracker process is not running (PID: $PID_NUM)"
        }
    }
    catch {
        Log-Message "Invalid PID in tracker.pid file: $PID_OR_JOB_ID"
    }
    
    # Remove the PID file
    Remove-Item "tracker.pid"
    Log-Message "Removed PID file"
}
else {
    Log-Message "No tracker PID file found. Tracker may not be running."
}

# Check for any other running instances
$RUNNING_INSTANCES = @(Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*node src/index.js*" })

if ($RUNNING_INSTANCES.Count -gt 0) {
    Log-Message "Found additional running tracker instances:"
    $RUNNING_INSTANCES | ForEach-Object { Log-Message "PID: $($_.Id), Command: $($_.CommandLine)" }
    
    Log-Message "Stopping all instances..."
    foreach ($process in $RUNNING_INSTANCES) {
        $PID_NUM = $process.Id
        Log-Message "Stopping process $PID_NUM..."
        
        if (-not $FORCE) {
            Stop-Process -Id $PID_NUM -ErrorAction SilentlyContinue
            
            # Wait for graceful shutdown
            for ($i = 1; $i -le $TIMEOUT; $i++) {
                if (-not (Is-ProcessRunning -processId $PID_NUM)) {
                    Log-Message "Process $PID_NUM terminated gracefully."
                    break
                }
                
                if ($VERBOSE) {
                    Log-Message "Still waiting... ($i/$TIMEOUT seconds)"
                }
                
                Start-Sleep -Seconds 1
            }
            
            # Force kill if still running
            if (Is-ProcessRunning -processId $PID_NUM) {
                Log-Message "Process $PID_NUM didn't terminate gracefully, forcing..."
                Stop-Process -Id $PID_NUM -Force -ErrorAction SilentlyContinue
            }
        }
        else {
            # Force kill immediately
            Stop-Process -Id $PID_NUM -Force -ErrorAction SilentlyContinue
            Log-Message "Process $PID_NUM forcefully terminated."
        }
    }
    
    Log-Message "All tracker instances stopped"
}

# Check for any test email processes
$TEST_PROCESSES = @(Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*node src/test.js*" })

if ($TEST_PROCESSES.Count -gt 0) {
    Log-Message "Found running test processes:"
    $TEST_PROCESSES | ForEach-Object { Log-Message "PID: $($_.Id), Command: $($_.CommandLine)" }
    
    Log-Message "Stopping all test processes..."
    foreach ($process in $TEST_PROCESSES) {
        $PID_NUM = $process.Id
        Log-Message "Stopping test process $PID_NUM..."
        Stop-Process -Id $PID_NUM -Force -ErrorAction SilentlyContinue
        Log-Message "Test process $PID_NUM terminated."
    }
}

Log-Message "Tracker shutdown complete"
exit 0
