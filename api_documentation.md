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

## Security & Authentication
- **Mechanism**: JWT via HttpOnly Cookies.
- **Login**: `POST /login` with `username` and `password`.
- **Authorization**: Roles are prefixed with `ROLE_` internally for Spring Security RBAC.
