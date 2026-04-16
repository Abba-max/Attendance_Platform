package group3.en.stuattendance.Attendancemanager.Model;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_hours", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"attendance_record_id", "hour_index"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class AttendanceHour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hour_id")
    private Integer hourId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_record_id", nullable = false)
    private AttendanceRecord attendanceRecord;

    @Column(name = "hour_index", nullable = false)
    private Integer hourIndex; // 0, 1, 2...

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;

    @Column(name = "verified_by_teacher")
    @Builder.Default
    private Boolean verifiedByTeacher = false;

    private LocalDateTime timestamp;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
