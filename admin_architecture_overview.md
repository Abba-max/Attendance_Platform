# Admin Functionalities & Authentication Architecture

## 1. Authentication & Security Architecture

The Student Attendance System implements a robust security layer powered by **Spring Security 6** and **JSON Web Tokens (JWT)**, designed for both security and ease of use.

### 1.1 Secure JWT Flow
The system uses a "Stateless with Cookies" approach:
- **Authentication**: Users authenticate via a standard login form. Upon success, the server generates a JWT containing the user's identity.
- **Token Storage**: The JWT is stored in an `HttpOnly` and `Secure` cookie. This prevents XSS attacks from stealing the token while maintaining a seamless user experience across page reloads.
- **Validation**: Every request is intercepted by `JwtAuthenticationFilter`, which validates the token and restores the user's security context without requiring a server-side session.

### 1.2 Role-Based Access Control (RBAC)
The system employs a granular RBAC model:
- **Unified Identity**: All users (Staff, Teachers, Students) are stored in a unified `User` table, distinguished by their assigned `Roles`.
- **Permissions**: Roles are collections of atomic `Permissions` (e.g., `MANAGE_USERS`, `RECORD_ATTENDANCE`). 
- **Spring Security Integration**: Roles are dynamically mapped to `GrantedAuthority` objects, enabling the use of `@PreAuthorize` annotations on backend endpoints.

### 1.3 Data Protection
- **Password Hashing**: All passwords are encrypted using **BCrypt** with a strong salt.
- **Secure Defaults**: A `DataInitializer` ensures that the system is always seeded with a default `admin` account and necessary roles/permissions upon first launch.

---

## 2. Admin Dashboard Functionalities

The Admin Dashboard is a centralized hub for institutional oversight and management.

### 2.1 Institutional Hierarchy Management
The dashboard provides a "drill-down" interface for managing the institution's structure:
- **Cycles**: Create and manage high-level academic cycles.
- **Departments**: Organize the institution into departments, each with assigned **Pedagogic Assistants** and **Supervisors**.
- **Classrooms**: Manage individual classrooms, specifying student capacity and academic levels.

### 2.2 User & Staff Management
- **Smart Onboarding**: Admins can create staff accounts with just a username and email. The system automatically generates a secure password and emails the credentials to the user.
- **Role Assignment**: Dynamic role management allows admins to upgrade or change user access levels in real-time.
- **Account Control**: Ability to deactivate/activate accounts or trigger manual password resets.

### 2.3 Academic Year Management
- **Lifecycle Control**: Admins can "Launch" new academic years, "Activate" them (which automatically handles transitions between sessions), and "Archive" old data.
- **State Enforcement**: The system ensures only one academic year is "Active" at any time, maintaining data integrity for attendance records.

### 2.4 System Configuration & Audit
- **RBAC Interface**: A dedicated UI for creating roles and assigning granular permissions.
- **Live Search**: Client-side filtering across all management tables for near-instant data retrieval.
- **Theme Support**: Integrated Light and Dark modes with persistent user preferences.
