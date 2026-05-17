# System Specification: Student Attendance Hour-Slot Check-in Logic

This document specifies the business rules, algorithms, and database synchronization logic for the student check-in and teacher manual override processes within the Student Attendance System.

---

## 1. Core Principles

1. **Hourly Slot Structure**:
   - Every session of duration $H$ hours consists of $H$ discrete 1-hour slots indexed $0, 1, \dots, H-1$.
   - Example: A 2-hour course from `08:00` to `10:00` has 2 slots:
     - **Slot 0**: `08:00 - 09:00` (First hour)
     - **Slot 1**: `09:00 - 10:00` (Second hour)

2. **Attendance Launch vs. Session Start**:
   - Only the teacher can start their scheduled session.
   - If a scheduled session is not started and its scheduled end time is passed, it is considered **MISSED**.
   - Starting the session (marking it `IN_PROGRESS`) and **launching attendance** (generating the temporary PIN or QR code) are decoupled. The teacher can launch attendance at any time: at the start, mid-journey, or near the end of the class.
   - The system tracks the exact timestamp when attendance is first launched in the session using `attendance_launched_at`.

3. **Check-in Validity**:
   - To check in successfully, a student must provide a valid QR code or PIN code, and satisfy geofencing constraints.

---

## 2. Check-in Hour-Slot Allocation Algorithm

When a student checks in at date-time $DT_{now}$ (with local time $T_{now} = DT_{now}.toLocalTime()$):

### Step 1: Detect Active Slot Index ($k$)
Identify the slot index $k \in [0, H-1]$ during which the student checks in:
- **Early Check-in** ($T_{now} < T_{start}$):
  - Targets the first slot ($k = 0$).
- **In-Class Check-in** ($T_{start} \le T_{now} < T_{end}$):
  - Find $k$ such that:
    $$T_{start} + k \text{ hours} \le T_{now} < T_{start} + (k + 1) \text{ hours}$$
- **Late Check-in / Fallback** ($T_{now} \ge T_{end}$):
  - Targets the last slot ($k = H - 1$).

### Step 2: Evaluate Deadline and Grace Period
Calculate if the student is considered **on-time** for the targeted slot $k$ based on two alternative rules:

- **Rule A (Standard Hour Deadline)**:
  - Each hour slot has a check-in deadline equal to **15 minutes before the end of the slot**.
  - Slot $k$ deadline: $T_{deadline, k} = T_{start} + (k + 1) \text{ hours} - 15 \text{ minutes}$.
  - The student is on-time if:
    $$T_{now} \le T_{deadline, k}$$

- **Rule B (Teacher Attendance Launch Grace Period)**:
  - If the teacher launched attendance late (e.g., mid-journey), the student has a **10-minute grace period** starting from the exact launch timestamp.
  - The student is on-time if:
    $$DT_{now} \le DT_{attendanceLaunchedAt} + 10 \text{ minutes}$$

- **Combined Evaluation**:
  - The student is considered **on-time** for the slot $k$ if they satisfy **Rule A OR Rule B**.

### Step 3: Assign Slot Statuses
- **On-time for active slot $k$**:
  - Mark preceding slots $0, \dots, k-1$ as **PRESENT**.
  - Mark active slot $k$ as **PRESENT**.
  - Mark subsequent slots $k+1, \dots, H-1$ as **ABSENT** (to be checked/verified by the teacher).
- **Late for active slot $k$**:
  - Mark preceding slots $0, \dots, k-1$ as **PRESENT**.
  - Mark active slot $k$ as **LATE** (indicating late arrival).
  - Mark subsequent slots $k+1, \dots, H-1$ as **ABSENT** (to be checked/verified by the teacher).

---

## 3. Teacher Manual Override & Consistency Integrity

To ensure that the teacher's manual overrides (marking a student `PRESENT`, `ABSENT`, `LATE`, or `EXCUSED` for specific slots) are saved and updated correctly without database inconsistencies or cached QR/PIN state locks:

1. **Recalculating Overall Attendance Status**:
   The student's overall record status (`status` in `attendance_records`) is dynamically computed from their individual slot statuses:
   - **PRESENT**: if they have at least one hour slot marked `PRESENT`.
   - **LATE**: if they have no `PRESENT` slots but at least one `LATE` slot.
   - **EXCUSED**: if they have no `PRESENT` or `LATE` slots but at least one `EXCUSED` slot.
   - **ABSENT**: if all slots are explicitly marked `ABSENT` (or there are no slots).

2. **Elimination of cached verification overrides**:
   Legacy QR and PIN validation flags (`qr_validated`, `pin_validated`) no longer lock the overall presence status. Derived status rules are absolute and fully respected, allowing the teacher to mark a scanned student as `ABSENT` seamlessly.

---

## 4. Analytical Case Tracing (e.g. 2-Hour Class, 08:00 - 10:00)

| Session Start Time | Attendance Launched | Check-in Time ($DT_{now}$) | Targeted Slot ($k$) | Standard Deadline | Grace Period Ends | On Time? (Combined) | Resulting Hour Slots | Explanation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **08:00** | **08:00** | **08:30** | Slot 0 | 08:45 | 08:10 | **Yes** (Standard) | Slot 1: **PRESENT**<br>Slot 2: **ABSENT** | Normal on-time first-hour check-in. |
| **08:00** | **08:00** | **08:50** | Slot 0 | 08:45 | 08:10 | **No** | Slot 1: **LATE**<br>Slot 2: **ABSENT** | Late check-in for the first hour. Slot 1 is marked **LATE**. |
| **08:00** | **09:40** (Mid-journey) | **09:48** | Slot 1 | 09:45 | 09:50 | **Yes** (Grace Period) | Slot 1: **PRESENT**<br>Slot 2: **PRESENT** | Missed standard, but saved by +10m Attendance Launch Grace Period (scanned 8 mins after launch). |
| **08:00** | **09:40** (Mid-journey) | **09:52** | Slot 1 | 09:45 | 09:50 | **No** | Slot 1: **PRESENT**<br>Slot 2: **LATE** | Late check-in for the second hour. Preceding hour (Slot 1) is **PRESENT**; active hour (Slot 2) is **LATE**. |

