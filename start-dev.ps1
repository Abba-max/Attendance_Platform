Write-Host "Checking for stuck processes on port 8080..." -ForegroundColor Yellow
$process = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "Found stuck process (PID: $($process.OwningProcess)) on port 8080. Terminating..." -ForegroundColor Red
    Stop-Process -Id $process.OwningProcess -Force
    Start-Sleep -Seconds 2
} else {
    Write-Host "Port 8080 is clear." -ForegroundColor Green
}

Write-Host "Starting Spring Boot..." -ForegroundColor Cyan
.\mvnw spring-boot:run
