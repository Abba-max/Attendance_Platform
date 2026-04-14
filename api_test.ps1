$BASE = [string]'http://localhost:8080'

function Req {
    param([string]$Method, [string]$Path, $Body, $WS)
    $p = @{ Uri = ($BASE + $Path); Method = $Method; WebSession = $WS; ErrorAction = 'SilentlyContinue' }
    if ($Body) { $p.Body = ($Body | ConvertTo-Json -Depth 5); $p.ContentType = 'application/json' }
    try {
        $r = Invoke-WebRequest @p
        $j = $null; try { $j = $r.Content | ConvertFrom-Json } catch {}
        return @{ Code = [int]$r.StatusCode; Data = $j; Text = $r.Content }
    } catch {
        $c = 0; try { $c = [int]$_.Exception.Response.StatusCode } catch {}
        return @{ Code = $c; Data = $null; Text = $_.Exception.Message }
    }
}

Write-Host 'STEP 1: Teacher login' -ForegroundColor Cyan
$ts = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try { Invoke-WebRequest -Uri ($BASE+'/login') -Method POST -Body 'username=teacher1&password=teacher' -ContentType 'application/x-www-form-urlencoded' -WebSession $ts -MaximumRedirection 0 -ErrorAction SilentlyContinue | Out-Null } catch {}
$tjwt = ($ts.Cookies.GetCookies($BASE) | Where-Object { $_.Name -eq 'attendee-token' }).Value
if ($tjwt) { Write-Host '[OK] Teacher JWT ok' -ForegroundColor Green } else { Write-Host '[FAIL] No JWT - wrong credentials?' -ForegroundColor Red; exit 1 }

Write-Host 'STEP 2: Schedule' -ForegroundColor Cyan
$sch = Req 'GET' '/api/teacher/sessions/my-schedule' $null $ts
if ($sch.Code -ne 200) { Write-Host ('[FAIL] HTTP ' + $sch.Code) -ForegroundColor Red; exit 1 }
$allS = $sch.Data
Write-Host ('[OK] ' + $allS.Count + ' sessions') -ForegroundColor Green
$allS | ForEach-Object { Write-Host ('  ID=' + $_.sessionId + ' ' + $_.courseName + ' ' + $_.status) }
$pick = $allS | Where-Object { $_.status -eq 'SCHEDULED' -or $_.status -eq 'IN_PROGRESS' } | Select-Object -First 1
if (-not $pick) { Write-Host '[FAIL] No runnable session' -ForegroundColor Red; exit 1 }
$SID = $pick.sessionId
Write-Host ('[OK] Using ID=' + $SID + ' ' + $pick.courseName + ' ' + $pick.status) -ForegroundColor Green

Write-Host 'STEP 3: Start session' -ForegroundColor Cyan
if ($pick.status -eq 'SCHEDULED') {
    $st = Req 'POST' ('/api/teacher/sessions/' + $SID + '/start') $null $ts
    if ($st.Code -eq 200) { Write-Host ('[OK] Status=' + $st.Data.status) -ForegroundColor Green } else { Write-Host ('[FAIL] ' + $st.Text) -ForegroundColor Red; exit 1 }
} else { Write-Host '[OK] Already IN_PROGRESS' -ForegroundColor Green }

Write-Host 'STEP 4: Generate PIN' -ForegroundColor Cyan
$pr = Req 'POST' '/api/attendance/session-token' @{ sessionId = $SID; type = 'PIN' } $ts
if ($pr.Code -ne 200) { Write-Host ('[FAIL] ' + $pr.Text) -ForegroundColor Red; exit 1 }
$PIN = $pr.Data.token
Write-Host ('[OK] PIN=' + $PIN) -ForegroundColor Green

Write-Host 'STEP 5: Generate QR' -ForegroundColor Cyan
$qr = Req 'POST' '/api/attendance/session-token' @{ sessionId = $SID; type = 'QR' } $ts
if ($qr.Code -ne 200) { Write-Host ('[FAIL] ' + $qr.Text) -ForegroundColor Red; exit 1 }
$QR = $qr.Data.token
Write-Host ('[OK] QR=' + $QR) -ForegroundColor Green

Write-Host 'STEP 6: Student login' -ForegroundColor Cyan
$ss = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try { Invoke-WebRequest -Uri ($BASE+'/login') -Method POST -Body 'username=maurelledjiofack%40gmail.com&password=morelle' -ContentType 'application/x-www-form-urlencoded' -WebSession $ss -MaximumRedirection 0 -ErrorAction SilentlyContinue | Out-Null } catch {}
$sjwt = ($ss.Cookies.GetCookies($BASE) | Where-Object { $_.Name -eq 'attendee-token' }).Value
if ($sjwt) { Write-Host '[OK] Student JWT ok' -ForegroundColor Green } else { Write-Host '[FAIL] Student login failed' -ForegroundColor Red; exit 1 }

Write-Host 'STEP 7: Student check-in' -ForegroundColor Cyan
$ci = Req 'POST' '/api/student/attendance/check-in' @{ sessionId = $SID; qrData = $QR; pinCode = $PIN } $ss
if ($ci.Code -eq 200) {
    Write-Host '[OK] CHECK-IN SUCCESS' -ForegroundColor Green
    Write-Host ('  Status=' + $ci.Data.status + ' QR=' + $ci.Data.qrValidated + ' PIN=' + $ci.Data.pinValidated)
    $ci.Data.hourSlots | ForEach-Object { Write-Host ('  H' + $_.hourIndex + '=' + $_.status) }
} else { Write-Host ('[FAIL] HTTP ' + $ci.Code + ': ' + $ci.Text) -ForegroundColor Red }

Write-Host 'STEP 8: Roll call' -ForegroundColor Cyan
$rc = Req 'GET' ('/api/attendance/session/' + $SID + '/students') $null $ts
if ($rc.Code -eq 200) {
    Write-Host ('[OK] ' + $rc.Data.Count + ' in roster') -ForegroundColor Green
    $rc.Data | ForEach-Object { Write-Host ('  ' + $_.firstName + ' ' + $_.lastName + ' isLive=' + $_.isLive + ' status=' + $_.status) }
} else { Write-Host ('[FAIL] ' + $rc.Text) -ForegroundColor Red }

Write-Host 'STEP 9: Finalize' -ForegroundColor Cyan
$fin = Req 'POST' ('/api/teacher/sessions/' + $SID + '/end') $null $ts
if ($fin.Code -eq 200) { Write-Host ('[OK] Status=' + $fin.Data.status) -ForegroundColor Green } else { Write-Host ('[FAIL] HTTP ' + $fin.Code + ': ' + $fin.Text) -ForegroundColor Red }

Write-Host 'STEP 10: Verify persistence' -ForegroundColor Cyan
$per = Req 'GET' ('/api/attendance/session/' + $SID + '/students') $null $ts
if ($per.Code -eq 200) {
    Write-Host '[OK] Final state:' -ForegroundColor Green
    $per.Data | ForEach-Object {
        Write-Host ('  ' + $_.firstName + ' ' + $_.lastName + ' Status=' + $_.status)
        $_.hourSlots | ForEach-Object { Write-Host ('    H' + $_.hourIndex + '=' + $_.status) }
    }
} else { Write-Host ('[FAIL] ' + $per.Text) -ForegroundColor Red }
