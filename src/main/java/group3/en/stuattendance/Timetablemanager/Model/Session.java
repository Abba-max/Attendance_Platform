package group3.en.stuattendance.Timetablemanager.Model;

import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Usermanager.Model.Teacher;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "sessions", indexes = {
        @Index(name = "idx_session_date", columnList = "date"),
        @Index(name = "idx_qr_code", columnList = "qr_code")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Integer sessionId;

    @Column(length = 20)
    private String day;

    private LocalDate date;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    private Integer week;

    @Column(name = "location_geographical_coordinates", length = 100)
    private String locationGeographicalCoordinates;

    @Column(name = "qr_code", unique = true, length = 500)
    private String qrCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    @JsonIgnore
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    @JsonIgnore
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    @JsonIgnore
    private Classroom classroom;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<AttendanceRecord> attendanceRecords = new HashSet<>();

    public boolean isActive() {
        LocalTime now = LocalTime.now();
        LocalDate today = LocalDate.now();
        return this.date != null && this.date.equals(today) &&
                now.isAfter(startTime.minusMinutes(15)) &&
                now.isBefore(endTime.plusMinutes(15));
    }
}