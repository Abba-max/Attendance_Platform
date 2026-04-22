package group3.en.stuattendance.Institutionmanager.DTO;

public class MigrationResponse {

    private boolean success;
    private String message;
    private Integer studentId;
    private String studentName;
    private String fromClassroom;
    private String toClassroom;

    public MigrationResponse() {}

    public MigrationResponse(boolean success, String message, Integer studentId,
                             String studentName, String fromClassroom, String toClassroom) {
        this.success = success;
        this.message = message;
        this.studentId = studentId;
        this.studentName = studentName;
        this.fromClassroom = fromClassroom;
        this.toClassroom = toClassroom;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Integer getStudentId() { return studentId; }
    public void setStudentId(Integer studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getFromClassroom() { return fromClassroom; }
    public void setFromClassroom(String fromClassroom) { this.fromClassroom = fromClassroom; }

    public String getToClassroom() { return toClassroom; }
    public void setToClassroom(String toClassroom) { this.toClassroom = toClassroom; }
}