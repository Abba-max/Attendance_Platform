package group3.en.stuattendance.model;

import group3.en.stuattendance.model.enums.JustificationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;

@Entity
@Table(name = "justifications", indexes = {
        @Index(name = "idx_student_status", columnList = "student_id, status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Justification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "justification_id")
    private Integer justificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    @JsonIgnore
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id")
    @JsonIgnore
    private AttendanceRecord attendanceRecord;

    @Column(name = "document_path", length = 500)
    private String documentPath;

    @Column(length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JustificationStatus status = JustificationStatus.PENDING;

    @Column(name = "reason_for_rejection", length = 500)
    private String reasonForRejection;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}