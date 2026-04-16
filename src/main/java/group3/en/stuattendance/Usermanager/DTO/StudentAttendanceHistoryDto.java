package group3.en.stuattendance.Usermanager.DTO;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class StudentAttendanceHistoryDto {
    private Integer attendanceId;
    private String courseName;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private AttendanceStatus status;
    private LocalDateTime checkInTime;
    private String teacherName;

    public StudentAttendanceHistoryDto() {}

    public StudentAttendanceHistoryDto(Integer attendanceId, String courseName, LocalDate date, LocalTime startTime, LocalTime endTime, AttendanceStatus status, LocalDateTime checkInTime, String teacherName) {
        this.attendanceId = attendanceId;
        this.courseName = courseName;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
        this.checkInTime = checkInTime;
        this.teacherName = teacherName;
    }

    public static StudentAttendanceHistoryDtoBuilder builder() {
        return new StudentAttendanceHistoryDtoBuilder();
    }

    // Getters and Setters
    public Integer getAttendanceId() { return attendanceId; }
    public void setAttendanceId(Integer id) { this.attendanceId = id; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String name) { this.courseName = name; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime time) { this.startTime = time; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime time) { this.endTime = time; }

    public AttendanceStatus getStatus() { return status; }
    public void setStatus(AttendanceStatus status) { this.status = status; }

    public LocalDateTime getCheckInTime() { return checkInTime; }
    public void setCheckInTime(LocalDateTime time) { this.checkInTime = time; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String name) { this.teacherName = name; }

    public static class StudentAttendanceHistoryDtoBuilder {
        private Integer attendanceId;
        private String courseName;
        private LocalDate date;
        private LocalTime startTime;
        private LocalTime endTime;
        private AttendanceStatus status;
        private LocalDateTime checkInTime;
        private String teacherName;

        public StudentAttendanceHistoryDtoBuilder attendanceId(Integer id) { this.attendanceId = id; return this; }
        public StudentAttendanceHistoryDtoBuilder courseName(String name) { this.courseName = name; return this; }
        public StudentAttendanceHistoryDtoBuilder date(LocalDate date) { this.date = date; return this; }
        public StudentAttendanceHistoryDtoBuilder startTime(LocalTime time) { this.startTime = time; return this; }
        public StudentAttendanceHistoryDtoBuilder endTime(LocalTime time) { this.endTime = time; return this; }
        public StudentAttendanceHistoryDtoBuilder status(AttendanceStatus status) { this.status = status; return this; }
        public StudentAttendanceHistoryDtoBuilder checkInTime(LocalDateTime time) { this.checkInTime = time; return this; }
        public StudentAttendanceHistoryDtoBuilder teacherName(String name) { this.teacherName = name; return this; }

        public StudentAttendanceHistoryDto build() {
            return new StudentAttendanceHistoryDto(attendanceId, courseName, date, startTime, endTime, status, checkInTime, teacherName);
        }
    }
}
