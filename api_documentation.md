# Student Attendance System API Documentation

## 1. User & Staff Management (`/api/admin`)
| Endpoint | Method | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `/api/admin/staff` | `POST` | Register a new staff member (Staff, Supervisor, etc.) | `{ "username": "jsmith", "email": "j@ex.com", "roleNames": ["SUPERVISOR"] }` |
| `/api/admin/staff` | `GET` | Retrieve a list of all staff members | N/A |
| `/api/admin/users` | `GET` | Retrieve a list of all system users | N/A |
| `/api/admin/users/{id}` | `DELETE` | Permanently delete a user account | N/A |
| `/api/admin/users/{id}/reset-password` | `POST` | Manually reset a user's password | `"newPassword123"` |
| `/api/admin/users/{id}/roles` | `PUT` | Update a user's assigned roles | `[1, 2]` |

## 2. Institutional Hierarchy (`/api/admin/institutions`, `/api/admin/cycles`, etc.)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/admin/institutions/{id}` | `PUT` | Edit institution details (name, location) |
| `/api/admin/cycles` | `POST` | Create a new academic cycle |
| `/api/admin/departments` | `POST` | Create a new department with assigned staff |
| `/api/admin/departments/{id}/assign` | `POST` | Assign Pedagogic Assistant or Supervisors |
| `/api/admin/classrooms` | `POST` | Create a new classroom with capacity |

## 3. RBAC (Roles & Permissions) (`/api/admin`)
| Endpoint | Method | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `/api/admin/roles` | `GET/POST` | List or create system roles | `{ "name": "MANAGER" }` |
| `/api/admin/roles/{roleName}/permissions` | `PUT` | Sync permissions for a role | `["USER_READ"]` |
| `/api/admin/permissions` | `GET/POST` | List or create atomic permissions | `{ "name": "AUDIT_VIEW" }` |

## 4. Academic Year Lifecycle (`/api/admin/academic-years`)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/admin/academic-years` | `GET/POST` | List or Launch a new academic year |
| `/api/admin/academic-years/{id}/activate` | `PUT` | Set as ACTIVE (Deactivates others) |
| `/api/admin/academic-years/{id}/suspend` | `PUT` | Suspend the active session |
| `/api/admin/academic-years/{id}/close` | `PUT` | Gracefully close the session |

## 5. Teacher Session Management (`/api/teacher`)
| Endpoint | Method | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `/api/teacher/sessions/my-schedule` | `GET` | Get personal weekly schedule | N/A |
| `/api/teacher/sessions/{id}/start` | `POST` | Start a scheduled session | N/A |
| `/api/teacher/sessions/{id}/end` | `POST` | End session (triggers auto-absence) | N/A |
| `/api/teacher/sessions/{id}/cancel` | `POST` | Cancel a scheduled class | N/A |
| `/api/teacher/sessions/{id}/export` | `GET` | Download attendance sheet (CSV) | N/A |

## 6. Student Attendance & Check-in (`/api/attendance`)
| Endpoint | Method | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `/api/attendance/student/check-in` | `POST` | Multi-factor check-in | `{ "sessionId": 1, "userId": 5, "qrCode": "QR_...", "location": "lat,long" }` |
| `/api/attendance/session/{id}/enrollment` | `GET` | Real-time roll-call status | N/A |
| `/api/attendance/session-token` | `POST` | Generate PIN or QR for session | `{ "sessionId": 1, "type": "PIN" }` |

## 7. Pedagogic Oversight & Monitoring (`/api/pedagog`)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/pedagog/sessions/live` | `GET` | Real-time monitoring of active sessions |
| `/api/pedagog/sessions/{id}/monitoring` | `GET` | Detailed roll-call status for a session |
| `/api/pedagog/sessions/{id}/cancel` | `POST` | Emergency cancellation of a class |
| `/api/pedagog/sessions/{id}/export` | `GET` | Archive attendance sheet (CSV) |

> [!NOTE]
> **Timetable Synchronization**: Saving a weekly timetable (`POST /api/timetablecontent`) automatically generates `SCHEDULED` sessions for that week. Updating a timetable replaces any existing `SCHEDULED` sessions for that period.

## Security & Authentication
- **Mechanism**: JWT via Authorization header (Bearer token).
- **Login**: `POST /login` with `username` and `password`.
- **Authorization**: Role-based access control (RBAC). Roles: `ADMIN`, `TEACHER`, `STUDENT`, `PEDAGOG`.
