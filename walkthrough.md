
## 14. Advanced Filters for Absences and Courses ?

**Files:** student.html, student-dashboard.js

- **Absence Filters**:
  - **Status Filter**: Added a dropdown to filter by PRESENT, ABSENT, LATE, EXCUSED. This filter **communicates with the backend** by appending &status=... to the /api/student/attendance/history request.
  - **Justification Filter**: Added a dropdown to filter by PENDING, APPROVED, REJECTED, or UNJUSTIFIED (Needs Justification). This works client-side on the fetched data.
- **Course Filters**:
  - **Threshold Filter**: Added a dropdown to filter courses by attendance yield: Critical (<75%), Warning (75-85%), or Good (>85%).
  - **Sort Filter**: Added options to sort courses by Name (A-Z), Lowest Yield, or Highest Yield.
  - Both course filters work client-side for instant feedback.

## 15. Fixed Syntax Error in student-dashboard.js ?

**Files:** student-dashboard.js

- **Fixed Syntax Error**: Removed an extra closing brace } on line 850 that was left behind during the extraction of enderHistoryWithFilters. This syntax error prevented the entire script from being parsed by the browser, causing ReferenceError: switchTab is not defined when clicking navigation items.

## 16. Fixed Course Loading Error and Mobile Day Picker Visibility ?

**Files:** student.html, student-dashboard.js

- **Fixed Undefined Function Call**: In loadCourseStats(), changed the call from ilterAndRenderCourses() to searchCourses() to match the actual function name implemented in student-dashboard.js. This resolves the "filterAndRenderCourses is not defined" error.
- **Fixed Mobile Day Picker Leaking**: Moved the "Mobile List View" (containing the day picker row Mon, Tue, etc.) *inside* the #view-calendar div. Previously, it was a direct child of the scrolling container, causing it to remain visible on mobile even when switching to Absences, Courses, or Settings tabs. Now it correctly hides along with the rest of the schedule view.

## 17. Attendance PDF Export Enhancements ✅

**Files:** `PdfExportServiceImpl.java`

- **Dynamic Scheduled Hour Slots**: Instead of a static "STATUS" column, the PDF table now dynamically generates columns matching the scheduled duration of the course session (`H1`, `H2`, ..., `HN` columns where N is `totalHours`).
- **Colored Ticks for Hour Slots**:
    - **PRESENT**: Marked with a green tick `✓` inside a light green background.
    - **EXCUSED**: Marked with a yellow `E` inside a yellow background.
    - **LATE**: Marked with an amber `L` inside a light orange background.
    - **ABSENT**: Marked with a red cross `✗` inside a light red background.
- **Enhanced Summary Statistics**: The summary statistics card now explicitly lists counts for `EXCUSED` status records alongside present, late, and absent metrics.

## 18. UI Polish: Header, Logo, and Summary Cards ?

**Files:** student.html

- **Header Update**: Replaced the static "Dashboard" text in the top header with a personalized "Welcome, [firstName]" message using Thymeleaf.
- **Overview Cleanup**: Removed the redundant "Welcome, [firstName]" heading from the Overview section content area.
- **Logo Size**: Increased the mobile-visible app logo size in the header from w-8 h-8 to w-12 h-12 for better visibility.
- **Summary Cards (Courses)**: Reduced padding and text sizes, and forced them into a strict 3-column grid on all screens so they sit on a single horizontal row.
- **Summary Cards (Absences)**: Similarly reduced padding and text sizes, and forced them into a strict 2-column grid on all screens.

## 18. Fixed Missing Submit Button on Justification Modal ?

**Files:** student.html

- **Added Submit Button**: Added the missing <button type="submit"> inside the justification form in the modal.
- **Fixed Malformed HTML**: Closed the <form> tag properly which was left open.
- **Enforced Backend Validation**: Added the equired attribute to the file input field, as the backend endpoint (/api/student/justifications/upload) expects a file part and would fail with a 400 error if submitted without one.

## 19. Justification Refinement (DTO Updates) ✅

**Files:** `StudentDashboardStatsDto.java`, `StudentServiceImpl.java`

- **Separated Absence Counters**: Added `unexcusedAbsences` (only `ABSENT` status) and `excusedAbsences` (only `EXCUSED` status) to `StudentDashboardStatsDto`.
- **Preserved Compatibility**: Kept `totalAbsences` as the sum of unexcused and excused absences to ensure existing frontend views continue to display correctly.
- **Accurate Physical Presence Rate**: Updated overall attendance presence rate calculation to treat `LATE` as physically present (alongside `PRESENT`), while keeping `EXCUSED` and `ABSENT` correctly designated as physically absent.

## 20. Justification Bug Fix (Absent Slot Restriction) ✅

**Files:** `JustificationServiceImpl.java`

- **Restricted Approvals**: Added an `isAbsent` check prior to executing `markHourStatus` for single-hour justification approvals. This prevents the approval of a justification from incorrectly converting a student's `PRESENT` or `LATE` hour slots to `EXCUSED`. Justifications are now strictly filtered to only affect hours where the student was actually marked `ABSENT`.

## 20. Performance Optimizations (Logging and Lazy-Loading) ✅

**Files:** `application.properties`, `student-dashboard.js`, `admin-dashboard.js`

- **Eclipse Log Optimization**: Modified logging levels in `application.properties` by disabling `spring.jpa.show-sql` and setting package log levels to `INFO` and `org.hibernate.SQL` level to `ERROR`. This drastically reduces the huge console log volume during execution and compilation.
- **Lazy-Loaded Student Views**: Delayed `loadCourseStats()` and `loadAttendanceHistory()` on the Student Dashboard. Instead of triggering immediately at startup during `DOMContentLoaded`, they are now exclusively executed on-demand when the user clicks the corresponding "Courses" or "Absences" tabs, optimizing resource fetching.
- **Lazy-Loaded Admin Views**: Removed `loadRoleAndPermissionData()` from the initial `DOMContentLoaded` load on the Administrator Dashboard. This heavy fetch is now strictly resolved on-demand when the administrator navigates to the "Roles & Permissions" section.

## 21. Teacher & Pedagogic Assistant Dashboard Lazy-Loading ✅

**Files:** `teacher-dashboard.js`, `pedagog-dashboard.js`

- **Lazy-Loaded Teacher Stats**: Removed `loadTeacherStats()` from the teacher dashboard's initial startup sequence. The class course context lists are now fetched strictly on-demand when navigating to the "Stats" tab (`navigateTo('stats')`).
- **Pedagogic Assistant Native Lazy-Loading**: Conducted an architecture audit on the Pedagogic Assistant Dashboard. Confirmed it operates natively with deep-linking lazy fetches (e.g. `loadPlanning()`, `loadSessionsMonitor()`, `loadJustifications()`, `loadHubClasses()`, `loadAttendanceStats()`) triggered on-demand by programmatically clicking sidebar tabs according to active route segments. Added no additional startup overhead.

## 21. Teacher & Pedagogic Assistant Dashboard Lazy-Loading ✅

**Files:** `teacher-dashboard.js`, `pedagog-dashboard.js`

- **Lazy-Loaded Teacher Stats**: Removed `loadTeacherStats()` from the teacher dashboard's initial startup sequence. The class course context lists are now fetched strictly on-demand when navigating to the "Stats" tab (`navigateTo('stats')`).
- **Pedagogic Assistant Native Lazy-Loading**: Conducted an architecture audit on the Pedagogic Assistant Dashboard. Confirmed it operates natively with deep-linking lazy fetches (e.g. `loadPlanning()`, `loadSessionsMonitor()`, `loadJustifications()`, `loadHubClasses()`, `loadAttendanceStats()`) triggered on-demand by programmatically clicking sidebar tabs according to active route segments. Added no additional startup overhead.
