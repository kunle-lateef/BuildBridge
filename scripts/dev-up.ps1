# Brings up everything BuildBridge's local dev environment needs beyond
# `npm run dev` on its own: Redis (Memurai), object storage (MinIO), and the
# analysis/notification worker processes (see workers/*.ts - these are
# separate processes from the Next.js server by design, so nothing enqueued
# on the BullMQ queues ever gets picked up without them running).
#
# Safe to re-run any time - each step checks whether its target is already
# up before starting it, so running this after a partial restart (e.g. only
# the workers died) won't spawn duplicates.

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$minioDataDir = "$env:LOCALAPPDATA\bb-minio-data"
$minioExe = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\MinIO.Server_Microsoft.Winget.Source_8wekyb3d8bbwe\minio.exe"

function Test-PortOpen($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

Write-Host "== BuildBridge local services ==" -ForegroundColor Cyan

# 1. Redis (Memurai) - installed as an auto-starting Windows service, so
# normally already running; started here only as a safety net.
$memurai = Get-Service -Name Memurai -ErrorAction SilentlyContinue
if ($memurai -and $memurai.Status -ne 'Running') {
    Write-Host "Starting Memurai (Redis) service..."
    Start-Service -Name Memurai
}
elseif (-not $memurai) {
    Write-Warning "Memurai service not found - Redis will not be available. See the setup notes for install steps."
}
else {
    Write-Host "Redis (Memurai): already running" -ForegroundColor Green
}

# 2. MinIO (object storage) - not a Windows service, so it needs to be
# spawned as its own process in its own window if it isn't already up.
if (Test-PortOpen 9000) {
    Write-Host "MinIO (storage): already running" -ForegroundColor Green
}
elseif (Test-Path $minioExe) {
    Write-Host "Starting MinIO..."
    $minioCmd = "`$env:MINIO_ROOT_USER='buildbridge'; `$env:MINIO_ROOT_PASSWORD='buildbridge-local-dev'; & '$minioExe' server '$minioDataDir' --console-address ':9001'"
    Start-Process powershell -ArgumentList @('-NoExit', '-Command', $minioCmd) -WindowStyle Normal
    Start-Sleep -Seconds 2
}
else {
    Write-Warning "minio.exe not found at expected path - install via 'winget install --id MinIO.Server -e'."
}

# 3. Next.js dev server
if (Test-PortOpen 3000) {
    Write-Host "Dev server: already running" -ForegroundColor Green
}
else {
    Write-Host "Starting dev server..."
    Start-Process powershell -ArgumentList @('-NoExit', '-Command', "Set-Location '$repoRoot'; npm run dev") -WindowStyle Normal
}

# 4. Analysis + notification workers - plain background processes, so
# "already running" is checked by process command line rather than a port.
$analysisRunning = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like '*analysis-worker.ts*' }
if ($analysisRunning) {
    Write-Host "Analysis worker: already running" -ForegroundColor Green
}
else {
    Write-Host "Starting analysis worker..."
    Start-Process powershell -ArgumentList @('-NoExit', '-Command', "Set-Location '$repoRoot'; npm run worker") -WindowStyle Normal
}

$notifRunning = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like '*notification-worker.ts*' }
if ($notifRunning) {
    Write-Host "Notification worker: already running" -ForegroundColor Green
}
else {
    Write-Host "Starting notification worker..."
    Start-Process powershell -ArgumentList @('-NoExit', '-Command', "Set-Location '$repoRoot'; npm run worker:notifications") -WindowStyle Normal
}

Write-Host "== Done. Give it a few seconds, then check http://localhost:3000 ==" -ForegroundColor Cyan
