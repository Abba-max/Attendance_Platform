# API Reference - Student Attendance System

This document outlines the core REST endpoints available for the Student Attendance System, including security roles and expected payloads.

---

## 1. Authentication & Identity
All requests (except login) must include a `Authorization: Bearer <token>` header.

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate and receive a JWT. |
| `GET` | `/api/notifications/my` | Authenticated | Get real-time alerts for the current user. |

---

## 2. Attendance (Roll-Call)

### Student Check-In
**`POST /api/attendance/student/check-in`**
- **Role**: `STUDENT`
- **Payload**:
```json
{
  "sessionId": 123,
  "qrCode": "DYNAMIC_TOKEN_HERE",
  "pin": "1234",
  "location": "LAT,LONG"
}
```
- **Note**: The `userId` is automatically pulled from the JWT token for security.

### Teacher Verification (Manual)
**`POST /api/attendance/teacher/verify`**
- **Role**: `TEACHER`
- **Payload**:
```json
{
  "sessionId": 123,
  "userId": 456,
  "hourIndex": 0
}
```
- **Note**: If `hourIndex` is provided, only that hour is marked. To mark ALL hours, use `/teacher/verify-all`.

**`POST /api/attendance/teacher/verify-all`**
- **Role**: `TEACHER`
- **Payload**: `{ "sessionId": 123, "userId": 456 }`

### Token Generation
**`POST /api/attendance/session-token`**
- **Role**: `TEACHER`
- **Payload**: `{ "sessionId": 123, "type": "QR" }` (or "PIN")

---

## 3. Justifications

### Student Submission
**`POST /api/justifications`**
- **Role**: `STUDENT`
- **Payload**: `Multipart/Form-Data`
    - `justification`: JSON Blob (mapped to `JustificationDto`)
    - `document`: File (optional)

### Administrative Review
**`PUT /api/justifications/{id}/approve`**
- **Role**: `PEDAGOG`

**`PUT /api/justifications/{id}/reject`**
- **Role**: `PEDAGOG`
- **Params**: `reasonForRejection` (String)

---

## 4. Student Dashboard

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/student/schedule/today` | `STUDENT` | List of sessions for the current day. |
| `GET` | `/api/student/attendance/history` | `STUDENT` | Paginated list of attendance records. |
| `GET` | `/api/student/dashboard/stats` | `STUDENT` | Overall attendance % and course breakdown. |

---

## 5. WebSockets (STOMP)
**Endpoint**: `ws://localhost:8080/ws`

### Subscriptions
- **Private Notifications**: `/user/queue/notifications`
- **Live Roll-Call**: `/topic/session/{sessionId}`
- **QR Token Rotation**: `/topic/session/{sessionId}/qr`
