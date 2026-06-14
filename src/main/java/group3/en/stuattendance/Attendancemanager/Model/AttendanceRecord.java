package group3.en.stuattendance.Attendancemanager.Model;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Usermanager.Model.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "attendance_records", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_session", columnNames = {"user_id", "session_id"})
}, indexes = {
        @Index(name = "idx_ar_user_session", columnList = "user_id, session_id"),
        @Index(name = "idx_ar_session",      columnList = "session_id"),
        @Index(name = "idx_ar_user",         columnList = "user_id"),
        @Index(name = "idx_ar_status",       columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Integer attendanceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    /**
     * Legacy column — references the old `students` table FK.
     * Set to nullable so MySQL skips FK validation (NULL bypasses FK checks).
     * Hibernate will ALTER this column to allow NULL on next startup (ddl-auto=update).
     */
    @Column(name = "student_id", nullable = true)
    @JsonIgnore
    private Integer studentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private Session session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;

    @Column(name = "hours_attended")
    @Builder.Default
    private Integer hoursAttended = 0;

    private LocalDateTime timestamp;

    @Column(name = "location_at_checkin", length = 100)
    private String locationAtCheckin;

    @OneToMany(mappedBy = "attendanceRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AttendanceHour> hourSlots = new ArrayList<>();

    @OneToMany(mappedBy = "attendanceRecord", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Justification> justifications = new HashSet<>();

    @Column(length = 500)
    private String comments;

    @Column(name = "qr_validated")
    @Builder.Default
    private Boolean qrValidated = false;

    @Column(name = "geo_validated")
    @Builder.Default
    private Boolean geoValidated = false;

    @Column(name = "pin_validated")
    @Builder.Default
    private Boolean pinValidated = false;

    @Column(name = "verified_by_teacher")
    @Builder.Default
    private Boolean verifiedByTeacher = false;

    @Column(name = "observed_at")
    private LocalDateTime observedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}