# Student Attendance System API Documentation

This document outlines the available REST API endpoints for the Student Attendance System, categorized by service area.

## ⚠️ Configuration Prerequisites

Before using features that involve email notifications (like user creation), you MUST configure your SMTP settings in `application.properties`:

1.  **Gmail Users**: You cannot use your standard password. You must generate a **16-character App Password**:
    -   Go to your Google Account settings.
    -   Enable **2-Step Verification**.
    -   Search for **App Passwords**.
    -   Select 'Mail' and 'Other (Spring Boot App)'.
    -   Copy the generated password into `spring.mail.password`.
2.  **Generic SMTP**: Update `spring.mail.host`, `port`, `username`, and `password` accordingly.

---

## 1. User & Staff Management (`/api/admin`)

Manage administrative staff, general users, and their status.

| Endpoint | Method | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `/api/admin/staff` | `POST` | Register a new staff member (Staff, Supervisor, etc.) | `{ "username": "jsmith", "email": "john@example.com", "roleNames": ["SUPERVISOR"] }` |
| `/api/admin/staff` | `GET` | Retrieve a list of all staff members | N/A |
| `/api/admin/users` | `GET` | Retrieve a list of all system users | N/A |
| `/api/admin/users/{id}` | `DELETE` | Permanently delete a user account | N/A |
| `/api/admin/users/{id}/reset-password` | `POST` | Manually reset a user's password | `"newPassword123"` |
| `/api/admin/users/{id}/roles` | `PUT` | Update a user's assigned roles | `[1, 2]` (IDs of roles) |

> [!NOTE]
> When creating staff members, credentials (username and a generated temporary password) are automatically sent to the user's email address.

## 2. Pedagog Management (`/api/pedagog`)

Manage teachers and students within the institution.

| Endpoint | Method | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `/api/pedagog/teachers` | `POST` | Register a new teacher and associate with classrooms | `{ "username": "t_doe", "email": "t@example.com", "classroomIds": [1, 2] }` |
| `/api/pedagog/students` | `POST` | Register a new student and associate with a classroom | `{ "username": "s_doe", "email": "s@example.com", "classroomId": 1, "matricule": "MAT001" }` |

## 3. RBAC (Roles & Permissions) (`/api/admin`)

Configure system access levels and permissions.

| Endpoint | Method | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `/api/admin/roles` | `GET` | List all available roles | N/A |
| `/api/admin/roles` | `POST` | Create a new system role | `{ "name": "LAB_TECH", "description": "Lab Tech access" }` |
| `/api/admin/roles/{id}` | `DELETE` | Delete a specific role | N/A |
| `/api/admin/roles/{roleName}/permissions` | `PUT` | Synchronize permissions for a role | `["USER_READ", "USER_WRITE"]` |
| `/api/admin/permissions` | `GET` | List all available permissions | N/A |
| `/api/admin/permissions` | `POST` | Create a new atomic permission | `{ "name": "REPORT_VIEW", "description": "Can view reports" }` |
| `/api/admin/permissions/{id}` | `DELETE` | Delete a specific permission | N/A |

## 4. Academic Year Management (`/api/admin/academic-years`)

Manage the lifecycle of institutional academic sessions.

| Endpoint | Method | Description | Status Options |
| :--- | :--- | :--- | :--- |
| `/api/admin/academic-years` | `GET` | List all academic years | N/A |
| `/api/admin/academic-years` | `POST` | Create/Launch a new academic year | N/A |
| `/api/admin/academic-years/active` | `GET` | Get the currently active academic year | N/A |
| `/api/admin/academic-years/{id}/activate` | `PUT` | Set a specific year as ACTIVE | `ACTIVE` |
| `/api/admin/academic-years/{id}/suspend` | `PUT` | Suspend an active year | `SUSPENDED` |
| `/api/admin/academic-years/{id}/close` | `PUT` | Permanently CLOSE a year | `CLOSED` |
| `/api/admin/academic-years/{id}` | `DELETE` | Remove an archived (Non-Active) year | N/A |

## Security Notice
All endpoints listed above are protected and typically require `ADMIN` or specific manager-level roles. Session-based authentication is currently the default for dashboard interactions.
