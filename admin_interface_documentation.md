# Admin Interface Documentation

This document provides an overview of the REST endpoints, MVC controllers, and API routes available for the Administrative interface of the Student Attendance Management System.

## 1. REST Controllers (API Endpoints)

### AdminController
**Base Path**: `/api/admin`
Dedicated endpoints for administrative operations, including staff management and RBAC configuration.

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/staff` | Register a new staff member (Supervisor, Pedagog, etc.) | `StaffCreateDto` |
| `GET` | `/staff` | Retrieve all users with staff roles (excluding students) | None |
| `PUT` | `/roles/{roleName}/permissions` | Synchronize/Update permissions for a specific role | `Set<String>` (Permission Names) |
| `GET` | `/users` | Retrieve all users in the system | None |
| `DELETE` | `/users/{id}` | Delete a user by their unique ID | None |
| `PATCH` | `/users/{id}/reset-password` | Reset a user's password | `String` (New Password) |

---

### UserController
**Base Path**: `/api/users`
General user management endpoints. While some are public (registration), many require administrative privileges for modification.

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register a new user (primarily for students) | `UserDto` |
| `GET` | `/{id}` | Get detailed information for a specific user | None |
| `GET` | `/` | List all users | None |
| `PUT` | `/{id}` | Update user details (email, username, etc.) | `UserDto` |
| `DELETE` | `/{id}` | Remove a user from the system | None |
| `PATCH` | `/{id}/deactivate` | Set a user account to inactive | None |
| `PATCH` | `/{id}/activate` | Re-activate a user account | None |

---

## 2. View Controllers (UI Routes)

### AdminViewController
**Base Path**: `/admin`
Handles the rendering of the Admin Dashboard and associated views using Thymeleaf templates.

| Method | Route | Description | Template Used |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Root admin route; redirects to dashboard | N/A |
| `GET` | `/dashboard` | The primary Admin Dashboard landing page | `dashboards/admin.html` |

**Dashboard Model Attributes**:
The following attributes are provided to the `admin.html` dashboard for dynamic rendering:
- `roles`: All available system roles.
- `allPermissions`: All defined system permissions.
- `staffDto`: A blank `StaffCreateDto` for recruitment forms.
- `institutions`, `classrooms`, `courses`: Placeholder lists (to be populated in future phases).

---

## 3. Data Initializer Seeding

On application startup, the `DataInitializer` ensures the following core data exists:
- **Roles**: `ADMIN`, `TEACHER`, `SUPERVISOR`, `PEDAGOG`, `STUDENT`.
- **Permissions**: `MANAGE_USERS`, `MANAGE_ROLES`, `MANAGE_INSTITUTIONS`, `RECORD_ATTENDANCE`, `VIEW_REPORTS`, `MANAGE_COURSES`, `SCAN_QR`, `GENERATE_QR`.

---

## 4. Usage Requirements

- **Base URL**: All local development is typically hosted at `http://localhost:8080`.
- **Security**: While currently many endpoints are `.permitAll()` for development, they should eventually be protected with `@PreAuthorize("hasRole('ADMIN')")`.
- **Password Hashing**: The system uses **BCrypt** for all password storage via the `UserService`.
