package group3.en.stuattendance.Attendancemanager.DTO;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import java.time.LocalDateTime;
import java.util.List;

public class AttendanceRecordDto {

    private Integer attendanceId;
    private Integer userId;
    private Integer studentId;
    private String studentFirstName;
    private String studentLastName;
    private String studentName;
    private String studentMatricule;
    private Integer sessionId;
    private AttendanceStatus status;
    private String comments;
    private Boolean verifiedByTeacher;
    private LocalDateTime timestamp;
    private String locationAtCheckin;
    private Boolean qrValidated;
    private Boolean geoValidated;
    private Boolean pinValidated;
    private LocalDateTime observedAt;
    private LocalDateTime createdAt;
    private List<AttendanceHourDto> hourSlots;

    public AttendanceRecordDto() {}

    public AttendanceRecordDto(Integer attendanceId, Integer userId, Integer studentId, String studentFirstName, String studentLastName, String studentName, String studentMatricule, Integer sessionId, AttendanceStatus status, String comments, Boolean verifiedByTeacher, LocalDateTime timestamp, String locationAtCheckin, Boolean qrValidated, Boolean geoValidated, Boolean pinValidated, LocalDateTime observedAt, LocalDateTime createdAt, List<AttendanceHourDto> hourSlots) {
        this.attendanceId = attendanceId;
        this.userId = userId;
        this.studentId = studentId;
        this.studentFirstName = studentFirstName;
        this.studentLastName = studentLastName;
        this.studentName = studentName;
        this.studentMatricule = studentMatricule;
        this.sessionId = sessionId;
        this.status = status;
        this.comments = comments;
        this.verifiedByTeacher = verifiedByTeacher;
        this.timestamp = timestamp;
        this.locationAtCheckin = locationAtCheckin;
        this.qrValidated = qrValidated;
        this.geoValidated = geoValidated;
        this.pinValidated = pinValidated;
        this.observedAt = observedAt;
        this.createdAt = createdAt;
        this.hourSlots = hourSlots;
    }

    public static AttendanceRecordDtoBuilder builder() {
        return new AttendanceRecordDtoBuilder();
    }

    // Getters and Setters
    public Integer getAttendanceId() { return attendanceId; }
    public void setAttendanceId(Integer attendanceId) { this.attendanceId = attendanceId; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public Integer getStudentId() { return studentId; }
    public void setStudentId(Integer studentId) { this.studentId = studentId; }

    public String getStudentFirstName() { return studentFirstName; }
    public void setStudentFirstName(String studentFirstName) { this.studentFirstName = studentFirstName; }

    public String getStudentLastName() { return studentLastName; }
    public void setStudentLastName(String studentLastName) { this.studentLastName = studentLastName; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentMatricule() { return studentMatricule; }
    public void setStudentMatricule(String studentMatricule) { this.studentMatricule = studentMatricule; }

    public Integer getSessionId() { return sessionId; }
    public void setSessionId(Integer sessionId) { this.sessionId = sessionId; }

    public AttendanceStatus getStatus() { return status; }
    public void setStatus(AttendanceStatus status) { this.status = status; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public Boolean getVerifiedByTeacher() { return verifiedByTeacher; }
    public void setVerifiedByTeacher(Boolean verifiedByTeacher) { this.verifiedByTeacher = verifiedByTeacher; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getLocationAtCheckin() { return locationAtCheckin; }
    public void setLocationAtCheckin(String locationAtCheckin) { this.locationAtCheckin = locationAtCheckin; }

    public Boolean getQrValidated() { return qrValidated; }
    public void setQrValidated(Boolean qrValidated) { this.qrValidated = qrValidated; }

    public Boolean getGeoValidated() { return geoValidated; }
    public void setGeoValidated(Boolean geoValidated) { this.geoValidated = geoValidated; }

    public Boolean getPinValidated() { return pinValidated; }
    public void setPinValidated(Boolean pinValidated) { this.pinValidated = pinValidated; }

    public LocalDateTime getObservedAt() { return observedAt; }
    public void setObservedAt(LocalDateTime observedAt) { this.observedAt = observedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<AttendanceHourDto> getHourSlots() { return hourSlots; }
    public void setHourSlots(List<AttendanceHourDto> hourSlots) { this.hourSlots = hourSlots; }

    public static class AttendanceRecordDtoBuilder {
        private Integer attendanceId;
        private Integer userId;
        private Integer studentId;
        private String studentFirstName;
        private String studentLastName;
        private String studentName;
        private String studentMatricule;
        private Integer sessionId;
        private AttendanceStatus status;
        private String comments;
        private Boolean verifiedByTeacher;
        private LocalDateTime timestamp;
        private String locationAtCheckin;
        private Boolean qrValidated;
        private Boolean geoValidated;
        private Boolean pinValidated;
        private LocalDateTime observedAt;
        private LocalDateTime createdAt;
        private List<AttendanceHourDto> hourSlots;

        public AttendanceRecordDtoBuilder attendanceId(Integer attendanceId) { this.attendanceId = attendanceId; return this; }
        public AttendanceRecordDtoBuilder userId(Integer userId) { this.userId = userId; return this; }
        public AttendanceRecordDtoBuilder studentId(Integer studentId) { this.studentId = studentId; return this; }
        public AttendanceRecordDtoBuilder studentFirstName(String studentFirstName) { this.studentFirstName = studentFirstName; return this; }
        public AttendanceRecordDtoBuilder studentLastName(String studentLastName) { this.studentLastName = studentLastName; return this; }
        public AttendanceRecordDtoBuilder studentName(String studentName) { this.studentName = studentName; return this; }
        public AttendanceRecordDtoBuilder studentMatricule(String studentMatricule) { this.studentMatricule = studentMatricule; return this; }
        public AttendanceRecordDtoBuilder sessionId(Integer sessionId) { this.sessionId = sessionId; return this; }
        public AttendanceRecordDtoBuilder status(AttendanceStatus status) { this.status = status; return this; }
        public AttendanceRecordDtoBuilder comments(String comments) { this.comments = comments; return this; }
        public AttendanceRecordDtoBuilder verifiedByTeacher(Boolean verifiedByTeacher) { this.verifiedByTeacher = verifiedByTeacher; return this; }
        public AttendanceRecordDtoBuilder timestamp(LocalDateTime timestamp) { this.timestamp = timestamp; return this; }
        public AttendanceRecordDtoBuilder locationAtCheckin(String locationAtCheckin) { this.locationAtCheckin = locationAtCheckin; return this; }
        public AttendanceRecordDtoBuilder qrValidated(Boolean qrValidated) { this.qrValidated = qrValidated; return this; }
        public AttendanceRecordDtoBuilder geoValidated(Boolean geoValidated) { this.geoValidated = geoValidated; return this; }
        public AttendanceRecordDtoBuilder pinValidated(Boolean pinValidated) { this.pinValidated = pinValidated; return this; }
        public AttendanceRecordDtoBuilder observedAt(LocalDateTime observedAt) { this.observedAt = observedAt; return this; }
        public AttendanceRecordDtoBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public AttendanceRecordDtoBuilder hourSlots(List<AttendanceHourDto> hourSlots) { this.hourSlots = hourSlots; return this; }

        public AttendanceRecordDto build() {
            return new AttendanceRecordDto(attendanceId, userId, studentId, studentFirstName, studentLastName, studentName, studentMatricule, sessionId, status, comments, verifiedByTeacher, timestamp, locationAtCheckin, qrValidated, geoValidated, pinValidated, observedAt, createdAt, hourSlots);
        }
    }
}
