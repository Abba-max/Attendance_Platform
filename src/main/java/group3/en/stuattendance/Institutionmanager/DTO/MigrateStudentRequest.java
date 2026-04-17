package group3.en.stuattendance.Institutionmanager.DTO;

public class MigrateStudentRequest {

    private Integer studentId;       // The student to migrate
    private Integer toClassroomId;   // The target classroom
    private String reason;           // Optional reason/note

    public MigrateStudentRequest() {}

    public Integer getStudentId() { return studentId; }
    public void setStudentId(Integer studentId) { this.studentId = studentId; }

    public Integer getToClassroomId() { return toClassroomId; }
    public void setToClassroomId(Integer toClassroomId) { this.toClassroomId = toClassroomId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}