$file = 'c:\Users\UsER\Documents\Transversal project\Student Attendance System\stuattendance\src\main\resources\static\js\admin\admin-dashboard.js'
$tmpFile = 'c:\Users\UsER\Documents\Transversal project\Student Attendance System\stuattendance\tmp_handleViewUser.js'
$lines = Get-Content $file -Encoding UTF8

$startIndex = -1
$endIndex = -1

for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^async function handleViewUser\(userId\) \{') {
        $startIndex = $i
        break
    }
}

if ($startIndex -ne -1) {
    # Find the closing brace of the function by tracking braces, or just look for the start of the next function
    for ($i = $startIndex + 1; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '^/\*\*\s*$') {
            # The start of a new JSDoc comment for the next function starts here
            $endIndex = $i - 1
            break
        }
    }
}

if ($startIndex -ne -1 -and $endIndex -ne -1) {
    $newLines = Get-Content $tmpFile -Encoding UTF8
    $finalContent = $lines[0..($startIndex-1)] + $newLines + $lines[$endIndex..($lines.Length-1)]
    Set-Content $file -Value $finalContent -Encoding UTF8
    Write-Output "Successfully replaced handleViewUser. Start: $startIndex, End: $endIndex"
} else {
    Write-Output "Failed to find handleViewUser boundaries. Start: $startIndex, End: $endIndex"
}
