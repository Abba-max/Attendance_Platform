package group3.en.stuattendance.Usermanager.Model;

import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import group3.en.stuattendance.Notificationmanager.Model.Notification;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import jakarta.persistence.*;
import lombok.*;
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
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "password_changed")
    @Builder.Default
    private Boolean passwordChanged = false;

    // RBAC
    @ManyToMany
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    // Manual Permission Overrides
    @ManyToMany
    @JoinTable(
        name = "user_additional_permissions",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    private Set<Permission> additionalPermissions = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "user_denied_permissions",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    private Set<Permission> deniedPermissions = new HashSet<>();

    // Institutional Hierarchy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id")
    @JsonIgnore
    private Institution institution;

    // For Students
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    @JsonIgnore
    private Classroom classroom;

    @Column(unique = true, length = 50)
    private String matricule;

    @Column(name = "external_email", length = 100)
    private String externalEmail;

    // For Staff (Teachers, Supervisors, etc.)
    @ManyToMany
    @JoinTable(
        name = "staff_classrooms",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "class_id")
    )
    @Builder.Default
    private Set<Classroom> staffClassrooms = new HashSet<>();

    @Column(name = "join_code", unique = true, length = 20)
    private String joinCode;

    // Relationships inherited from previous sub-entities
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<AttendanceRecord> attendanceRecords = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Justification> justifications = new HashSet<>();

    @ManyToMany(mappedBy = "teachers")
    @JsonIgnore
    @Builder.Default
    private Set<Course> courses = new HashSet<>();

    @OneToMany(mappedBy = "teacher", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Session> sessions = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Notification> notifications = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
}
