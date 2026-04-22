package group3.en.stuattendance.Institutionmanager.DTO;

public class StudentSelectionDto {

    private Integer studentId;
    private String fullName;
    private String matricule;
    private String email;
    private Integer classroomId;

    public StudentSelectionDto() {}

    public Integer getStudentId() { return studentId; }
    public void setStudentId(Integer studentId) { this.studentId = studentId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getMatricule() { return matricule; }
    public void setMatricule(String matricule) { this.matricule = matricule; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getClassroomId() { return classroomId; }
    public void setClassroomId(Integer classroomId) { this.classroomId = classroomId; }
}