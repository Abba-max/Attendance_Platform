package group3.en.stuattendance.Timetablemanager.Model;

import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Timetablemanager.Enum.SessionStatus;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "sessions", indexes = {
        @Index(name = "idx_session_date", columnList = "date"),
        @Index(name = "idx_qr_code", columnList = "qr_code")
})
@EntityListeners(AuditingEntityListener.class)
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

    @Column(name = "previous_qr_code", length = 500)
    private String previousQrCode;

    @Column(name = "temp_pin", length = 10)
    private String tempPin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    @JsonIgnore
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    @JsonIgnore
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timetable_entry_id")
    @JsonIgnore
    private TimetableEntry timetableEntry;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SessionStatus status = SessionStatus.SCHEDULED;

    @Column(name = "actual_start_time")
    private LocalDateTime actualStartTime;

    @Column(name = "actual_end_time")
    private LocalDateTime actualEndTime;

    @Column(name = "is_validated")
    private Boolean isValidated = false;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<AttendanceRecord> attendanceRecords = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "attendance_launched_at")
    private LocalDateTime attendanceLaunchedAt;

    public Session() {}

    public Session(Integer sessionId, String day, LocalDate date, LocalTime startTime, LocalTime endTime, Integer week, String location, String qrCode, String prevQr, String pin, Course course, User teacher, Classroom classroom, TimetableEntry entry, SessionStatus status, LocalDateTime actualStart, LocalDateTime actualEnd, Boolean isValidated, Set<AttendanceRecord> records, LocalDateTime createdAt, LocalDateTime updatedAt, LocalDateTime attendanceLaunchedAt) {
        this.sessionId = sessionId;
        this.day = day;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.week = week;
        this.locationGeographicalCoordinates = location;
        this.qrCode = qrCode;
        this.previousQrCode = prevQr;
        this.tempPin = pin;
        this.course = course;
        this.teacher = teacher;
        this.classroom = classroom;
        this.timetableEntry = entry;
        this.status = status;
        this.actualStartTime = actualStart;
        this.actualEndTime = actualEnd;
        this.isValidated = isValidated;
        this.attendanceRecords = records;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.attendanceLaunchedAt = attendanceLaunchedAt;
    }

    public static SessionBuilder builder() {
        return new SessionBuilder();
    }

    // Getters and Setters
    public Integer getSessionId() { return sessionId; }
    public void setSessionId(Integer id) { this.sessionId = id; }

    public String getDay() { return day; }
    public void setDay(String day) { this.day = day; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime time) { this.startTime = time; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime time) { this.endTime = time; }

    public Integer getWeek() { return week; }
    public void setWeek(Integer week) { this.week = week; }

    public String getLocationGeographicalCoordinates() { return locationGeographicalCoordinates; }
    public void setLocationGeographicalCoordinates(String loc) { this.locationGeographicalCoordinates = loc; }

    public String getQrCode() { return qrCode; }
    public void setQrCode(String code) { this.qrCode = code; }

    public String getPreviousQrCode() { return previousQrCode; }
    public void setPreviousQrCode(String code) { this.previousQrCode = code; }

    public String getTempPin() { return tempPin; }
    public void setTempPin(String pin) { this.tempPin = pin; }

    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }

    public User getTeacher() { return teacher; }
    public void setTeacher(User teacher) { this.teacher = teacher; }

    public Classroom getClassroom() { return classroom; }
    public void setClassroom(Classroom classroom) { this.classroom = classroom; }

    public TimetableEntry getTimetableEntry() { return timetableEntry; }
    public void setTimetableEntry(TimetableEntry entry) { this.timetableEntry = entry; }

    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus status) { this.status = status; }

    public LocalDateTime getActualStartTime() { return actualStartTime; }
    public void setActualStartTime(LocalDateTime time) { this.actualStartTime = time; }

    public LocalDateTime getActualEndTime() { return actualEndTime; }
    public void setActualEndTime(LocalDateTime time) { this.actualEndTime = time; }

    public Boolean getIsValidated() { return isValidated; }
    public void setIsValidated(Boolean val) { this.isValidated = val; }

    public Set<AttendanceRecord> getAttendanceRecords() { return attendanceRecords; }
    public void setAttendanceRecords(Set<AttendanceRecord> records) { this.attendanceRecords = records; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime time) { this.createdAt = time; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime time) { this.updatedAt = time; }

    public LocalDateTime getAttendanceLaunchedAt() { return attendanceLaunchedAt; }
    public void setAttendanceLaunchedAt(LocalDateTime time) { this.attendanceLaunchedAt = time; }

    public boolean isActive() {
        LocalTime now = LocalTime.now();
        LocalDate today = LocalDate.now();
        // Allow starting 15 mins early and up to the end of the session
        return this.date != null && this.date.equals(today) &&
                now.isAfter(startTime.minusMinutes(15)) &&
                now.isBefore(endTime);
    }

    public boolean isPast() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        if (this.date == null) return false;
        if (this.date.isBefore(today)) return true;
        if (this.date.equals(today) && now.isAfter(endTime)) return true;
        return false;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Session session = (Session) o;
        return Objects.equals(sessionId, session.sessionId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(sessionId);
    }

    public static class SessionBuilder {
        private Integer sessionId;
        private String day;
        private LocalDate date;
        private LocalTime startTime;
        private LocalTime endTime;
        private Integer week;
        private String location;
        private String qrCode;
        private String prevQr;
        private String pin;
        private Course course;
        private User teacher;
        private Classroom classroom;
        private TimetableEntry entry;
        private SessionStatus status = SessionStatus.SCHEDULED;
        private LocalDateTime actualStart;
        private LocalDateTime actualEnd;
        private Boolean isValidated = false;
        private Set<AttendanceRecord> records = new HashSet<>();
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime attendanceLaunchedAt;

        public SessionBuilder sessionId(Integer id) { this.sessionId = id; return this; }
        public SessionBuilder day(String day) { this.day = day; return this; }
        public SessionBuilder date(LocalDate date) { this.date = date; return this; }
        public SessionBuilder startTime(LocalTime time) { this.startTime = time; return this; }
        public SessionBuilder endTime(LocalTime time) { this.endTime = time; return this; }
        public SessionBuilder week(Integer week) { this.week = week; return this; }
        public SessionBuilder locationGeographicalCoordinates(String loc) { this.location = loc; return this; }
        public SessionBuilder qrCode(String code) { this.qrCode = code; return this; }
        public SessionBuilder previousQrCode(String code) { this.prevQr = code; return this; }
        public SessionBuilder tempPin(String pin) { this.pin = pin; return this; }
        public SessionBuilder course(Course course) { this.course = course; return this; }
        public SessionBuilder teacher(User teacher) { this.teacher = teacher; return this; }
        public SessionBuilder classroom(Classroom classroom) { this.classroom = classroom; return this; }
        public SessionBuilder timetableEntry(TimetableEntry entry) { this.entry = entry; return this; }
        public SessionBuilder status(SessionStatus status) { this.status = status; return this; }
        public SessionBuilder actualStartTime(LocalDateTime time) { this.actualStart = time; return this; }
        public SessionBuilder actualEndTime(LocalDateTime time) { this.actualEnd = time; return this; }
        public SessionBuilder isValidated(Boolean val) { this.isValidated = val; return this; }
        public SessionBuilder attendanceRecords(Set<AttendanceRecord> records) { this.records = records; return this; }
        public SessionBuilder createdAt(LocalDateTime time) { this.createdAt = time; return this; }
        public SessionBuilder updatedAt(LocalDateTime time) { this.updatedAt = time; return this; }
        public SessionBuilder attendanceLaunchedAt(LocalDateTime time) { this.attendanceLaunchedAt = time; return this; }

        public Session build() {
            return new Session(sessionId, day, date, startTime, endTime, week, location, qrCode, prevQr, pin, course, teacher, classroom, entry, status, actualStart, actualEnd, isValidated, records, createdAt, updatedAt, attendanceLaunchedAt);
        }
    }
}