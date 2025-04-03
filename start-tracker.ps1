# Start the REAL ID Appointment Tracker as a background process
Write-Host "Starting REAL ID Appointment Tracker..."

# Check if the tracker is already running
if (Test-Path "tracker.pid") {
    $PID_FILE = Get-Content "tracker.pid"
    try {
        $process = Get-Process -Id $PID_FILE -ErrorAction Stop
        Write-Host "Tracker is already running with PID $PID_FILE"
        Write-Host "To stop the tracker, run: .\stop-tracker.ps1"
        Write-Host "To restart the tracker, run: .\stop-tracker.ps1; .\start-tracker.ps1"
        exit 1
    }
    catch {
        Write-Host "Found stale PID file. Removing..."
        Remove-Item "tracker.pid"
    }
}

# Check for any other running instances
$runningNodeProcesses = @(Get-Process -Name "node" -ErrorAction SilentlyContinue)
$RUNNING_INSTANCES = $runningNodeProcesses | Where-Object { $_.CommandLine -like "*node src/index.js*" }

if ($RUNNING_INSTANCES -and $RUNNING_INSTANCES.Count -gt 0) {
    Write-Host "WARNING: Found $($RUNNING_INSTANCES.Count) running tracker instances."
    Write-Host "Please stop all instances first with: .\stop-tracker.ps1"
    exit 1
}

# Create job script that will run in the background
$jobScriptPath = Join-Path $PWD "tracker-job.ps1"
@"
Set-Location "$PWD"
`$env:NODE_ENV = 'production'
node src/index.js > tracker-output.log 2>&1
"@ | Out-File -FilePath $jobScriptPath

# Start the tracker in the background using Start-Job
$job = Start-Job -FilePath $jobScriptPath

# Wait briefly to ensure the job starts
Start-Sleep -Seconds 1

# Get the process ID associated with the job
$jobInfo = Get-Job -Id $job.Id | Select-Object -ExpandProperty ChildJobs
$nodeProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.StartTime -ge (Get-Date).AddSeconds(-5) } | 
    Sort-Object StartTime -Descending | 
    Select-Object -First 1

if ($nodeProcess) {
    # Save the process ID
    $nodeProcess.Id | Out-File -FilePath "tracker.pid"
    Write-Host "Tracker started with PID $($nodeProcess.Id) (Job ID: $($job.Id))"
} else {
    $job.Id | Out-File -FilePath "tracker.pid"
    Write-Host "Tracker started as Job ID: $($job.Id) (PID will be logged when available)"
}

Write-Host "Logs are being written to tracker.log and tracker-output.log"
Write-Host "To stop the tracker, run: .\stop-tracker.ps1"
