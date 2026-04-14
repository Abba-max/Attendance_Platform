package group3.en.stuattendance.Usermanager.DTO;

import java.time.LocalDate;
import java.time.LocalTime;

public class StudentScheduleDto {
    private Integer sessionId;
    private String courseName;
    private String teacherName;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String classroomName;
    private String status;
    private String attendanceStatus;

    public StudentScheduleDto() {}

    public StudentScheduleDto(Integer sessionId, String courseName, String teacherName, LocalDate date, LocalTime startTime, LocalTime endTime, String classroomName, String status, String attendanceStatus) {
        this.sessionId = sessionId;
        this.courseName = courseName;
        this.teacherName = teacherName;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.classroomName = classroomName;
        this.status = status;
        this.attendanceStatus = attendanceStatus;
    }

    public static StudentScheduleDtoBuilder builder() {
        return new StudentScheduleDtoBuilder();
    }

    // Getters and Setters
    public Integer getSessionId() { return sessionId; }
    public void setSessionId(Integer sessionId) { this.sessionId = sessionId; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getClassroomName() { return classroomName; }
    public void setClassroomName(String classroomName) { this.classroomName = classroomName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAttendanceStatus() { return attendanceStatus; }
    public void setAttendanceStatus(String attendanceStatus) { this.attendanceStatus = attendanceStatus; }

    public static class StudentScheduleDtoBuilder {
        private Integer sessionId;
        private String courseName;
        private String teacherName;
        private LocalDate date;
        private LocalTime startTime;
        private LocalTime endTime;
        private String classroomName;
        private String status;
        private String attendanceStatus;

        public StudentScheduleDtoBuilder sessionId(Integer sessionId) { this.sessionId = sessionId; return this; }
        public StudentScheduleDtoBuilder courseName(String courseName) { this.courseName = courseName; return this; }
        public StudentScheduleDtoBuilder teacherName(String teacherName) { this.teacherName = teacherName; return this; }
        public StudentScheduleDtoBuilder date(LocalDate date) { this.date = date; return this; }
        public StudentScheduleDtoBuilder startTime(LocalTime startTime) { this.startTime = startTime; return this; }
        public StudentScheduleDtoBuilder endTime(LocalTime endTime) { this.endTime = endTime; return this; }
        public StudentScheduleDtoBuilder classroomName(String classroomName) { this.classroomName = classroomName; return this; }
        public StudentScheduleDtoBuilder status(String status) { this.status = status; return this; }
        public StudentScheduleDtoBuilder attendanceStatus(String attendanceStatus) { this.attendanceStatus = attendanceStatus; return this; }

        public StudentScheduleDto build() {
            return new StudentScheduleDto(sessionId, courseName, teacherName, date, startTime, endTime, classroomName, status, attendanceStatus);
        }
    }
}
