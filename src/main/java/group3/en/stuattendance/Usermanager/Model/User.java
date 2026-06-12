package group3.en.stuattendance.Usermanager.Model;

import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import group3.en.stuattendance.Notificationmanager.Model.Notification;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(unique = true, length = 100)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "password_changed")
    private Boolean passwordChanged = false;

    @ManyToMany
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "user_additional_permissions",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> additionalPermissions = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "user_denied_permissions",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> deniedPermissions = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id")
    @JsonIgnore
    private Institution institution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    @JsonIgnore
    private Classroom classroom;

    @Column(unique = true, length = 50)
    private String matricule;

    @Column(name = "external_email", length = 100)
    private String externalEmail;

    @ManyToMany
    @JoinTable(
        name = "staff_classrooms",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "class_id")
    )
    private Set<Classroom> staffClassrooms = new HashSet<>();

    @Column(name = "join_code", unique = true, length = 20)
    private String joinCode;

    @Column(name = "is_delegate")
    private Boolean isDelegate = false;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<AttendanceRecord> attendanceRecords = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Justification> justifications = new HashSet<>();

    @ManyToMany(mappedBy = "teachers")
    @JsonIgnore
    private Set<Course> courses = new HashSet<>();

    @OneToMany(mappedBy = "teacher", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Session> sessions = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Notification> notifications = new HashSet<>();

    @ManyToMany(mappedBy = "pedagogicAssistants")
    @JsonIgnore
    private Set<Department> managedDepartments = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public User() {}

    public User(Integer userId, String username, String email, String password, String firstName, String lastName, Boolean isActive, Boolean passwordChanged, Set<Role> roles, Set<Permission> additionalPermissions, Set<Permission> deniedPermissions, Institution institution, Classroom classroom, String matricule, String externalEmail, Set<Classroom> staffClassrooms, String joinCode, Boolean isDelegate, Set<AttendanceRecord> attendanceRecords, Set<Justification> justifications, Set<Course> courses, Set<Session> sessions, Set<Notification> notifications, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.password = password;
        this.firstName = firstName;
        this.lastName = lastName;
        this.isActive = isActive;
        this.passwordChanged = passwordChanged;
        this.roles = roles;
        this.additionalPermissions = additionalPermissions;
        this.deniedPermissions = deniedPermissions;
        this.institution = institution;
        this.classroom = classroom;
        this.matricule = matricule;
        this.externalEmail = externalEmail;
        this.staffClassrooms = staffClassrooms;
        this.joinCode = joinCode;
        this.isDelegate = isDelegate != null ? isDelegate : false;
        this.attendanceRecords = attendanceRecords;
        this.justifications = justifications;
        this.courses = courses;
        this.sessions = sessions;
        this.notifications = notifications;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static UserBuilder builder() {
        return new UserBuilder();
    }

    // Getters and Setters
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean active) { isActive = active; }

    public Boolean getPasswordChanged() { return passwordChanged; }
    public void setPasswordChanged(Boolean changed) { passwordChanged = changed; }

    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }

    public Set<Permission> getAdditionalPermissions() { return additionalPermissions; }
    public void setAdditionalPermissions(Set<Permission> perms) { additionalPermissions = perms; }

    public Set<Permission> getDeniedPermissions() { return deniedPermissions; }
    public void setDeniedPermissions(Set<Permission> perms) { deniedPermissions = perms; }

    public Institution getInstitution() { return institution; }
    public void setInstitution(Institution institution) { this.institution = institution; }

    public Classroom classroom() { return classroom; }
    public void setClassroom(Classroom classroom) { this.classroom = classroom; }

    public Classroom getClassroom() { return classroom; }

    public String getMatricule() { return matricule; }
    public void setMatricule(String matricule) { this.matricule = matricule; }

    public String getExternalEmail() { return externalEmail; }
    public void setExternalEmail(String externalEmail) { this.externalEmail = externalEmail; }

    public Set<Classroom> getStaffClassrooms() { return staffClassrooms; }
    public void setStaffClassrooms(Set<Classroom> classrooms) { staffClassrooms = classrooms; }

    public String getJoinCode() { return joinCode; }
    public void setJoinCode(String joinCode) { this.joinCode = joinCode; }

    public Boolean getIsDelegate() { return isDelegate != null ? isDelegate : false; }
    public void setIsDelegate(Boolean delegate) { isDelegate = delegate != null ? delegate : false; }

    public Set<AttendanceRecord> getAttendanceRecords() { return attendanceRecords; }
    public void setAttendanceRecords(Set<AttendanceRecord> records) { attendanceRecords = records; }

    public Set<Justification> getJustifications() { return justifications; }
    public void setJustifications(Set<Justification> justifications) { this.justifications = justifications; }

    public Set<Course> getCourses() { return courses; }
    public void setCourses(Set<Course> courses) { this.courses = courses; }

    public Set<Session> getSessions() { return sessions; }
    public void setSessions(Set<Session> sessions) { this.sessions = sessions; }

    public Set<Notification> getNotifications() { return notifications; }
    public void setNotifications(Set<Notification> notifications) { this.notifications = notifications; }

    public Set<Department> getManagedDepartments() { return managedDepartments; }
    public void setManagedDepartments(Set<Department> managedDepartments) { this.managedDepartments = managedDepartments; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(userId, user.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(userId);
    }

    public static class UserBuilder {
        private Integer userId;
        private String username;
        private String email;
        private String password;
        private String firstName;
        private String lastName;
        private Boolean isActive = true;
        private Boolean passwordChanged = false;
        private Set<Role> roles = new HashSet<>();
        private Set<Permission> additionalPermissions = new HashSet<>();
        private Set<Permission> deniedPermissions = new HashSet<>();
        private Institution institution;
        private Classroom classroom;
        private String matricule;
        private String externalEmail;
        private Set<Classroom> staffClassrooms = new HashSet<>();
        private String joinCode;
        private Boolean isDelegate = false;
        private Set<AttendanceRecord> attendanceRecords = new HashSet<>();
        private Set<Justification> justifications = new HashSet<>();
        private Set<Course> courses = new HashSet<>();
        private Set<Session> sessions = new HashSet<>();
        private Set<Notification> notifications = new HashSet<>();
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public UserBuilder userId(Integer userId) { this.userId = userId; return this; }
        public UserBuilder username(String username) { this.username = username; return this; }
        public UserBuilder email(String email) { this.email = email; return this; }
        public UserBuilder password(String password) { this.password = password; return this; }
        public UserBuilder firstName(String firstName) { this.firstName = firstName; return this; }
        public UserBuilder lastName(String lastName) { this.lastName = lastName; return this; }
        public UserBuilder isActive(Boolean isActive) { this.isActive = isActive; return this; }
        public UserBuilder passwordChanged(Boolean passwordChanged) { this.passwordChanged = passwordChanged; return this; }
        public UserBuilder roles(Set<Role> roles) { this.roles = roles; return this; }
        public UserBuilder additionalPermissions(Set<Permission> perms) { this.additionalPermissions = perms; return this; }
        public UserBuilder deniedPermissions(Set<Permission> perms) { this.deniedPermissions = perms; return this; }
        public UserBuilder institution(Institution institution) { this.institution = institution; return this; }
        public UserBuilder classroom(Classroom classroom) { this.classroom = classroom; return this; }
        public UserBuilder matricule(String matricule) { this.matricule = matricule; return this; }
        public UserBuilder externalEmail(String externalEmail) { this.externalEmail = externalEmail; return this; }
        public UserBuilder staffClassrooms(Set<Classroom> classrooms) { this.staffClassrooms = classrooms; return this; }
        public UserBuilder joinCode(String joinCode) { this.joinCode = joinCode; return this; }
        public UserBuilder isDelegate(Boolean isDelegate) { this.isDelegate = isDelegate; return this; }
        public UserBuilder attendanceRecords(Set<AttendanceRecord> records) { this.attendanceRecords = records; return this; }
        public UserBuilder justifications(Set<Justification> justifications) { this.justifications = justifications; return this; }
        public UserBuilder courses(Set<Course> courses) { this.courses = courses; return this; }
        public UserBuilder sessions(Set<Session> sessions) { this.sessions = sessions; return this; }
        public UserBuilder notifications(Set<Notification> notifications) { this.notifications = notifications; return this; }
        public UserBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public UserBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public User build() {
            return new User(userId, username, email, password, firstName, lastName, isActive, passwordChanged, roles, additionalPermissions, deniedPermissions, institution, classroom, matricule, externalEmail, staffClassrooms, joinCode, isDelegate, attendanceRecords, justifications, courses, sessions, notifications, createdAt, updatedAt);
        }
    }
}
