package group3.en.stuattendance.Usermanager.DTO;

public class TeacherStudentStatDto {
    private Integer studentId;
    private String studentName;
    private String studentEmail;
    private Integer attendedHours;
    private Integer totalCourseHours;
    private Double attendanceRate;

    public TeacherStudentStatDto() {}

    public TeacherStudentStatDto(Integer studentId, String studentName, String studentEmail, Integer attendedHours, Integer totalCourseHours, Double attendanceRate) {
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentEmail = studentEmail;
        this.attendedHours = attendedHours;
        this.totalCourseHours = totalCourseHours;
        this.attendanceRate = attendanceRate;
    }

    public Integer getStudentId() { return studentId; }
    public void setStudentId(Integer studentId) { this.studentId = studentId; }
    
    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }
    
    public String getStudentEmail() { return studentEmail; }
    public void setStudentEmail(String studentEmail) { this.studentEmail = studentEmail; }

    public Integer getAttendedHours() { return attendedHours; }
    public void setAttendedHours(Integer attendedHours) { this.attendedHours = attendedHours; }

    public Integer getTotalCourseHours() { return totalCourseHours; }
    public void setTotalCourseHours(Integer totalCourseHours) { this.totalCourseHours = totalCourseHours; }

    public Double getAttendanceRate() { return attendanceRate; }
    public void setAttendanceRate(Double attendanceRate) { this.attendanceRate = attendanceRate; }
}
