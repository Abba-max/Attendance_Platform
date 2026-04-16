$BASE = 'http://localhost:8080'
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -Uri ($BASE+'/login') -Method POST -Body 'username=teacher1&password=teacher' -ContentType 'application/x-www-form-urlencoded' -WebSession $s -MaximumRedirection 0 -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue | Out-Null
$jwt = ($s.Cookies.GetCookies($BASE) | Where-Object { $_.Name -eq 'attendee-token' }).Value
Write-Host 'Teacher JWT:' $jwt