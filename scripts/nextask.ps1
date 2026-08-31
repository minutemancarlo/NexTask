param(
    [string]$Action = "menu"
)

$RootDir = Split-Path -Parent $PSScriptRoot
if (-not $RootDir) { $RootDir = (Get-Location).Path }

$LogsDir = Join-Path $RootDir "logs"
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
}

function Get-PortProcessId([int]$Port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn -and $conn.OwningProcess -gt 0) {
            return [int]$conn.OwningProcess
        }
    } catch {}

    try {
        $lines = netstat -ano 2>$null | Select-String ":$Port\s+.*LISTENING"
        if ($lines) {
            $parts = ($lines[0].Line.Trim() -split '\s+')
            if ($parts.Count -ge 5) {
                return [int]$parts[-1]
            }
        }
    } catch {}

    return $null
}

function Start-NexTask {
    Write-Host "`n[NexTask] Checking services..." -ForegroundColor Cyan
    $bPid = Get-PortProcessId 3001
    $fPid = Get-PortProcessId 5173

    if ($bPid) {
        Write-Host "  Backend API is already running [PID: $bPid]" -ForegroundColor Yellow
    } else {
        Write-Host "  Starting Backend server on port 3001 silently..." -ForegroundColor Green
        Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoProfile -WindowStyle Hidden -Command `"Set-Location '$RootDir\server'; node server.js > '$LogsDir\server.log' 2>&1`"" `
            -WindowStyle Hidden
    }

    if ($fPid) {
        Write-Host "  Frontend App is already running [PID: $fPid]" -ForegroundColor Yellow
    } else {
        Write-Host "  Starting Frontend client on port 5173 silently..." -ForegroundColor Green
        Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoProfile -WindowStyle Hidden -Command `"Set-Location '$RootDir\client'; cmd.exe /c npm.cmd run dev > '$LogsDir\client.log' 2>&1`"" `
            -WindowStyle Hidden
    }

    Write-Host "  Waiting for services to initialize..." -ForegroundColor Gray
    for ($i = 0; $i -lt 12; $i++) {
        Start-Sleep -Milliseconds 500
        $bPid = Get-PortProcessId 3001
        $fPid = Get-PortProcessId 5173
        if ($bPid -and $fPid) { break }
    }

    Get-NexTaskStatus
}

function Stop-NexTask {
    Write-Host "`n[NexTask] Stopping all services silently..." -ForegroundColor Cyan
    $stopped = $false

    $bPid = Get-PortProcessId 3001
    if ($bPid) {
        try { cmd.exe /c "taskkill /F /T /PID $bPid" 2>$null | Out-Null } catch {}
        Write-Host "  Stopped Backend (PID: $bPid)" -ForegroundColor Green
        $stopped = $true
    }

    $fPid = Get-PortProcessId 5173
    if ($fPid) {
        try { cmd.exe /c "taskkill /F /T /PID $fPid" 2>$null | Out-Null } catch {}
        Write-Host "  Stopped Frontend (PID: $fPid)" -ForegroundColor Green
        $stopped = $true
    }

    if (-not $stopped) {
        Write-Host "  No active NexTask services were running." -ForegroundColor Gray
    } else {
        Write-Host "  All NexTask services stopped." -ForegroundColor Green
    }
}

function Get-NexTaskStatus {
    $bPid = Get-PortProcessId 3001
    $fPid = Get-PortProcessId 5173

    Write-Host "`n=== NexTask Service Status ===" -ForegroundColor Cyan
    if ($bPid) {
        Write-Host "  Backend API  (Port 3001): RUNNING [PID: $bPid]" -ForegroundColor Green
        Write-Host "  Endpoint: http://localhost:3001/api/health" -ForegroundColor Gray
    } else {
        Write-Host "  Backend API  (Port 3001): STOPPED" -ForegroundColor Red
    }

    if ($fPid) {
        Write-Host "  Frontend App (Port 5173): RUNNING [PID: $fPid]" -ForegroundColor Green
        Write-Host "  URL:      http://localhost:5173" -ForegroundColor Gray
    } else {
        Write-Host "  Frontend App (Port 5173): STOPPED" -ForegroundColor Red
    }
    Write-Host ""
}

function Show-Menu {
    do {
        Clear-Host
        Write-Host "======================================================" -ForegroundColor Cyan
        Write-Host "                 NEXTASK CONTROLLER                   " -ForegroundColor White
        Write-Host "======================================================" -ForegroundColor Cyan
        $bPid = Get-PortProcessId 3001
        $fPid = Get-PortProcessId 5173
        $bStr = if ($bPid) { "RUNNING ($bPid)" } else { "STOPPED" }
        $fStr = if ($fPid) { "RUNNING ($fPid)" } else { "STOPPED" }
        Write-Host " Status: Backend [$bStr] | Frontend [$fStr]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  [1] Start NexTask (Silently in Background)"
        Write-Host "  [2] Stop NexTask (Silently)"
        Write-Host "  [3] Restart NexTask"
        Write-Host "  [4] Check Status"
        Write-Host "  [5] Open in Browser (http://localhost:5173)"
        Write-Host "  [0] Exit"
        Write-Host "======================================================" -ForegroundColor Cyan
        $choice = Read-Host "Select an option [1-5, 0]"

        switch ($choice) {
            "1" { Start-NexTask; Pause }
            "2" { Stop-NexTask; Start-Sleep -Seconds 1 }
            "3" { Stop-NexTask; Start-Sleep -Seconds 1; Start-NexTask; Pause }
            "4" { Get-NexTaskStatus; Pause }
            "5" { Start-Process "http://localhost:5173" }
            "0" { return }
            default { Write-Host "Invalid option." -ForegroundColor Red; Start-Sleep -Seconds 1 }
        }
    } while ($true)
}

switch ($Action.ToLower()) {
    "start"   { Start-NexTask }
    "stop"    { Stop-NexTask }
    "restart" { Stop-NexTask; Start-Sleep -Seconds 1; Start-NexTask }
    "status"  { Get-NexTaskStatus }
    "open"    { Start-Process "http://localhost:5173" }
    "menu"    { Show-Menu }
    default   {
        Write-Host "Unknown command: $Action" -ForegroundColor Red
        Write-Host "Usage: nextask.bat [start | stop | restart | status | open]"
    }
}
