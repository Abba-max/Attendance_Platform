$BASE = "http://localhost:8080"
$script:PASS = $true

function Print-Step { param($msg); Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Print-OK   { param($msg); Write-Host "  [OK] $msg" -ForegroundColor Green }
function Print-FAIL { param($msg); Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:PASS = $false }
function Print-Info { param($msg); Write-Host "       $msg" -ForegroundColor Gray }

function Login {
    param($username, $password)
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    try {
        Invoke-WebRequest -Uri "$BASE/login" `
            -Method POST `
            -Body "username=$username&password=$password" `
            -ContentType "application/x-www-form-urlencoded" `
            -WebSession $session `
            -MaximumRedirection 0 `
            -ErrorAction SilentlyContinue | Out-Null
    } catch { }
    $jwt = $session.Cookies.GetCookies($BASE) | Where-Object { $_.Name -eq "attendee-token" }
    return @{ Session = $session; Token = $jwt.Value }
}

function Api {
    param($method, $path, $body, $webSession)
    $params = @{
        Uri         = "$BASE$path"
        Method      = $method
        WebSession  = $webSession
        ErrorAction = "SilentlyContinue"
    }
    if ($body) {
        $params.Body        = ($body | ConvertTo-Json -Depth 5)
        $params.ContentType = "application/json"
    }
    try {
        $resp   = Invoke-WebRequest @params
        $parsed = $null
        try { $parsed = $resp.Content | ConvertFrom-Json } catch { }
        return @{ Status = [int]$resp.StatusCode; Body = $parsed; Raw = $resp.Content }
    } catch {
        $sc = 0
        try { $sc = [int]$_.Exception.Response.StatusCode } catch { }
        return @{ Status = $sc; Body = $null; Raw = $_.Exception.Message }
    }
}

# ─── STEP 1: Teacher Login ────────────────────────────────────
Print-Step "STEP 1 — Login as Teacher (teacher1/teacher)"
$teacher = Login "teacher1" "teacher"
if ($teacher.Token) {
    Print-OK "Teacher JWT acquired."
    Print-Info $teacher.Token.Substring(0, [Math]::Min(60, $teacher.Token.Length))
} else {
    Print-FAIL "Teacher login FAILED. Stopping."
    exit 1
}

# ─── STEP 2: Fetch Schedule ───────────────────────────────────
Print-Step "STEP 2 — Fetch Teacher Schedule"
$scheduleResp = Api "GET" "/api/teacher/sessions/my-schedule" $null $teacher.Session
if ($scheduleResp.Status -ne 200) {
    Print-FAIL "Schedule request failed. HTTP $($scheduleResp.Status)"
    Print-Info $scheduleResp.Raw
    exit 1
}
$sessions = $scheduleResp.Body
Print-OK "Schedule loaded. Total sessions: $($sessions.Count)"

$commSession = $sessions | Where-Object { $_.courseName -match "ommunicat" } | Select-Object -First 1
if (-not $commSession) {
    $commSession = $sessions | Where-Object { $_.status -eq "SCHEDULED" -or $_.status -eq "IN_PROGRESS" } | Select-Object -First 1
}
if (-not $commSession) {
    Print-FAIL "No usable session found."
    foreach ($s in $sessions) { Print-Info "$($s.courseName) $($s.status) $($s.date)" }
    exit 1
}
Print-OK "Selected session ID=$($commSession.sessionId) Course=$($commSession.courseName) Status=$($commSession.status)"

$SESSION_ID     = $commSession.sessionId
$SESSION_STATUS = $commSession.status

# ─── STEP 3: Start session ────────────────────────────────────
Print-Step "STEP 3 — Start Session (if SCHEDULED)"
if ($SESSION_STATUS -eq "SCHEDULED") {
    $startResp = Api "POST" "/api/teacher/sessions/$SESSION_ID/start" $null $teacher.Session
    if ($startResp.Status -eq 200) {
        Print-OK "Session started. Status=$($startResp.Body.status)"
    } else {
        Print-FAIL "Start failed. HTTP $($startResp.Status)"
        Print-Info $startResp.Raw
        exit 1
    }
} elseif ($SESSION_STATUS -eq "IN_PROGRESS") {
    Print-OK "Already IN_PROGRESS — skipping start."
} else {
    Print-FAIL "Status '$SESSION_STATUS' cannot proceed."
    exit 1
}

# ─── STEP 4: Generate PIN ─────────────────────────────────────
Print-Step "STEP 4 — Generate PIN"
$pinResp = Api "POST" "/api/attendance/session-token" @{ sessionId = $SESSION_ID; type = "PIN" } $teacher.Session
if ($pinResp.Status -ne 200) {
    Print-FAIL "PIN failed. HTTP $($pinResp.Status) $($pinResp.Raw)"
    exit 1
}
$PIN = $pinResp.Body.token
Print-OK "PIN=$PIN"

# ─── STEP 5: Generate QR ─────────────────────────────────────
Print-Step "STEP 5 — Generate QR Token"
$qrResp = Api "POST" "/api/attendance/session-token" @{ sessionId = $SESSION_ID; type = "QR" } $teacher.Session
if ($qrResp.Status -ne 200) {
    Print-FAIL "QR failed. HTTP $($qrResp.Status) $($qrResp.Raw)"
    exit 1
}
$QR = $qrResp.Body.token
Print-OK "QR=$QR"

# ─── STEP 6: Student Login ────────────────────────────────────
Print-Step "STEP 6 — Login as Student (maurelledjiofack@gmail.com/morelle)"
$student = Login "maurelledjiofack@gmail.com" "morelle"
if ($student.Token) {
    Print-OK "Student JWT acquired."
} else {
    Print-FAIL "Student login FAILED. Stopping."
    exit 1
}

# ─── STEP 7: Student Check-In ────────────────────────────────
Print-Step "STEP 7 — Student Check-In (QR + PIN)"
$checkinBody = @{ sessionId = $SESSION_ID; qrData = $QR; pinCode = $PIN }
Print-Info "Payload: sessionId=$SESSION_ID  qrData=$QR  pinCode=$PIN"
$checkinResp = Api "POST" "/api/student/attendance/check-in" $checkinBody $student.Session

if ($checkinResp.Status -eq 200) {
    $rec = $checkinResp.Body
    Print-OK "CHECK-IN SUCCESSFUL"
    Print-Info "Record ID    : $($rec.id)"
    Print-Info "Status       : $($rec.status)"
    Print-Info "QR Validated : $($rec.qrValidated)"
    Print-Info "PIN Validated: $($rec.pinValidated)"
    Print-Info "Timestamp    : $($rec.timestamp)"
    $hoursArr = @()
    foreach ($h in $rec.hourSlots) { $hoursArr += "H$($h.hourIndex)=$($h.status)" }
    Print-Info "Hour Slots   : $($hoursArr -join ', ')"
} else {
    Print-FAIL "CHECK-IN FAILED. HTTP $($checkinResp.Status)"
    Print-Info $checkinResp.Raw
}

# ─── STEP 8: Teacher Roll Call ───────────────────────────────
Print-Step "STEP 8 — Teacher Roll Call View"
$rollCallResp = Api "GET" "/api/attendance/session/$SESSION_ID/students" $null $teacher.Session
if ($rollCallResp.Status -eq 200) {
    $roster = $rollCallResp.Body
    Print-OK "Roster: $($roster.Count) student(s)"
    foreach ($r in $roster) {
        $hoursArr = @()
        foreach ($h in $r.hourSlots) { $hoursArr += "H$($h.hourIndex)=$($h.status)" }
        Print-Info "$($r.firstName) $($r.lastName) isLive=$($r.isLive) hours=$($hoursArr -join ',')"
    }
} else {
    Print-FAIL "Roll call failed. HTTP $($rollCallResp.Status)"
    Print-Info $rollCallResp.Raw
}

# ─── STEP 9: Finalize Session ────────────────────────────────
Print-Step "STEP 9 — Finalize Session"
$finalizeResp = Api "POST" "/api/teacher/sessions/$SESSION_ID/end" $null $teacher.Session
if ($finalizeResp.Status -eq 200) {
    Print-OK "Session finalized. Status=$($finalizeResp.Body.status)"
} else {
    Print-FAIL "Finalize failed. HTTP $($finalizeResp.Status)"
    Print-Info $finalizeResp.Raw
}

# ─── STEP 10: Verify Persistence ─────────────────────────────
Print-Step "STEP 10 — Confirm Persistence After Close"
$persistResp = Api "GET" "/api/attendance/session/$SESSION_ID/students" $null $teacher.Session
if ($persistResp.Status -eq 200) {
    Print-OK "Persistence verified. Final state:"
    foreach ($r in $persistResp.Body) {
        $hoursArr = @()
        foreach ($h in $r.hourSlots) { $hoursArr += "H$($h.hourIndex)=$($h.status)" }
        Print-Info "$($r.firstName) $($r.lastName) Status=$($r.status) Hours=$($hoursArr -join ',')"
    }
} else {
    Print-FAIL "Persistence check failed. HTTP $($persistResp.Status)"
}

# ─── RESULT ───────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================"
if ($script:PASS) {
    Write-Host "  ALL STEPS PASSED" -ForegroundColor Black -BackgroundColor Green
} else {
    Write-Host "  SOME STEPS FAILED - see output above" -ForegroundColor White -BackgroundColor Red
}
Write-Host "============================================================"
