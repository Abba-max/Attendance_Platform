package group3.en.stuattendance.Institutionmanager.DTO;

import java.time.LocalDateTime;

public class ClassHistoryResponse {

    private Integer historyId;
    private Integer studentId;
    private String studentName;
    private String fromClassroom;
    private String toClassroom;
    private String migratedBy;
    private String reason;
    private LocalDateTime migratedAt;
    private String academicYear;    // e.g. "2024/2025"

    public ClassHistoryResponse() {}

    public Integer getHistoryId() { return historyId; }
    public void setHistoryId(Integer historyId) { this.historyId = historyId; }

    public Integer getStudentId() { return studentId; }
    public void setStudentId(Integer studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getFromClassroom() { return fromClassroom; }
    public void setFromClassroom(String fromClassroom) { this.fromClassroom = fromClassroom; }

    public String getToClassroom() { return toClassroom; }
    public void setToClassroom(String toClassroom) { this.toClassroom = toClassroom; }

    public String getMigratedBy() { return migratedBy; }
    public void setMigratedBy(String migratedBy) { this.migratedBy = migratedBy; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getMigratedAt() { return migratedAt; }
    public void setMigratedAt(LocalDateTime migratedAt) { this.migratedAt = migratedAt; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
}