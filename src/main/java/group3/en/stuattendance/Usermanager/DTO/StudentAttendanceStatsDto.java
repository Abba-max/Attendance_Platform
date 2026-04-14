package group3.en.stuattendance.Usermanager.DTO;

public class StudentAttendanceStatsDto {
    private Integer courseId;
    private String courseName;
    private long totalSessions;
    private long presentCount;
    private double attendanceRate;
    private Integer courseTotalHours;
    private Integer studentAttendedHours;
    private String teacherName;
    private String teacherEmail;

    public StudentAttendanceStatsDto() {}

    public StudentAttendanceStatsDto(Integer courseId, String courseName, long totalSessions, long presentCount, double attendanceRate, Integer courseTotalHours, Integer studentAttendedHours, String teacherName, String teacherEmail) {
        this.courseId = courseId;
        this.courseName = courseName;
        this.totalSessions = totalSessions;
        this.presentCount = presentCount;
        this.attendanceRate = attendanceRate;
        this.courseTotalHours = courseTotalHours;
        this.studentAttendedHours = studentAttendedHours;
        this.teacherName = teacherName;
        this.teacherEmail = teacherEmail;
    }

    public static StudentAttendanceStatsDtoBuilder builder() {
        return new StudentAttendanceStatsDtoBuilder();
    }

    // Getters and Setters
    public Integer getCourseId() { return courseId; }
    public void setCourseId(Integer id) { this.courseId = id; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String name) { this.courseName = name; }

    public long getTotalSessions() { return totalSessions; }
    public void setTotalSessions(long total) { this.totalSessions = total; }

    public long getPresentCount() { return presentCount; }
    public void setPresentCount(long count) { this.presentCount = count; }

    public double getAttendanceRate() { return attendanceRate; }
    public void setAttendanceRate(double rate) { this.attendanceRate = rate; }

    public Integer getCourseTotalHours() { return courseTotalHours; }
    public void setCourseTotalHours(Integer hours) { this.courseTotalHours = hours; }

    public Integer getStudentAttendedHours() { return studentAttendedHours; }
    public void setStudentAttendedHours(Integer hours) { this.studentAttendedHours = hours; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }

    public String getTeacherEmail() { return teacherEmail; }
    public void setTeacherEmail(String teacherEmail) { this.teacherEmail = teacherEmail; }

    public static class StudentAttendanceStatsDtoBuilder {
        private Integer courseId;
        private String courseName;
        private long totalSessions;
        private long presentCount;
        private double attendanceRate;
        private Integer courseTotalHours;
        private Integer studentAttendedHours;
        private String teacherName;
        private String teacherEmail;

        public StudentAttendanceStatsDtoBuilder courseId(Integer id) { this.courseId = id; return this; }
        public StudentAttendanceStatsDtoBuilder courseName(String name) { this.courseName = name; return this; }
        public StudentAttendanceStatsDtoBuilder totalSessions(long total) { this.totalSessions = total; return this; }
        public StudentAttendanceStatsDtoBuilder presentCount(long count) { this.presentCount = count; return this; }
        public StudentAttendanceStatsDtoBuilder attendanceRate(double rate) { this.attendanceRate = rate; return this; }
        public StudentAttendanceStatsDtoBuilder courseTotalHours(Integer hours) { this.courseTotalHours = hours; return this; }
        public StudentAttendanceStatsDtoBuilder studentAttendedHours(Integer hours) { this.studentAttendedHours = hours; return this; }
        public StudentAttendanceStatsDtoBuilder teacherName(String name) { this.teacherName = name; return this; }
        public StudentAttendanceStatsDtoBuilder teacherEmail(String email) { this.teacherEmail = email; return this; }

        public StudentAttendanceStatsDto build() {
            return new StudentAttendanceStatsDto(courseId, courseName, totalSessions, presentCount, attendanceRate, courseTotalHours, studentAttendedHours, teacherName, teacherEmail);
        }
    }
}
