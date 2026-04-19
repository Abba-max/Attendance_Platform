package group3.en.stuattendance.Institutionmanager.Model;

import group3.en.stuattendance.Usermanager.Model.User;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "student_class_history")
@EntityListeners(AuditingEntityListener.class)
public class StudentClassHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Integer historyId;

    // The student who was migrated
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    // The classroom the student came FROM
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_classroom_id", nullable = false)
    private Classroom fromClassroom;

    // The classroom the student moved TO
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_classroom_id", nullable = false)
    private Classroom toClassroom;

    // The academic year of the target classroom
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academic_year_id", nullable = false)
    private AcademicYear academicYear;

    // The PEDAGOG who performed the migration
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "migrated_by_id")
    private User migratedBy;

    // Optional reason or note
    @Column(length = 255)
    private String reason;

    @CreatedDate
    @Column(name = "migrated_at", nullable = false, updatable = false)
    private LocalDateTime migratedAt;

    public StudentClassHistory() {}

    // Getters and Setters
    public Integer getHistoryId() { return historyId; }
    public void setHistoryId(Integer historyId) { this.historyId = historyId; }

    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }

    public Classroom getFromClassroom() { return fromClassroom; }
    public void setFromClassroom(Classroom fromClassroom) { this.fromClassroom = fromClassroom; }

    public Classroom getToClassroom() { return toClassroom; }
    public void setToClassroom(Classroom toClassroom) { this.toClassroom = toClassroom; }

    public AcademicYear getAcademicYear() { return academicYear; }
    public void setAcademicYear(AcademicYear academicYear) { this.academicYear = academicYear; }

    public User getMigratedBy() { return migratedBy; }
    public void setMigratedBy(User migratedBy) { this.migratedBy = migratedBy; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getMigratedAt() { return migratedAt; }
    public void setMigratedAt(LocalDateTime migratedAt) { this.migratedAt = migratedAt; }
}