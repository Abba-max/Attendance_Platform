package group3.en.stuattendance.Usermanager.DTO;

public class StudentAttendanceStatsDto {
    private Integer courseId;
    private String courseName;
    private long totalSessions;
    private long presentCount;
    private double attendanceRate;

    public StudentAttendanceStatsDto() {}

    public StudentAttendanceStatsDto(Integer courseId, String courseName, long totalSessions, long presentCount, double attendanceRate) {
        this.courseId = courseId;
        this.courseName = courseName;
        this.totalSessions = totalSessions;
        this.presentCount = presentCount;
        this.attendanceRate = attendanceRate;
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

    public static class StudentAttendanceStatsDtoBuilder {
        private Integer courseId;
        private String courseName;
        private long totalSessions;
        private long presentCount;
        private double attendanceRate;

        public StudentAttendanceStatsDtoBuilder courseId(Integer id) { this.courseId = id; return this; }
        public StudentAttendanceStatsDtoBuilder courseName(String name) { this.courseName = name; return this; }
        public StudentAttendanceStatsDtoBuilder totalSessions(long total) { this.totalSessions = total; return this; }
        public StudentAttendanceStatsDtoBuilder presentCount(long count) { this.presentCount = count; return this; }
        public StudentAttendanceStatsDtoBuilder attendanceRate(double rate) { this.attendanceRate = rate; return this; }

        public StudentAttendanceStatsDto build() {
            return new StudentAttendanceStatsDto(courseId, courseName, totalSessions, presentCount, attendanceRate);
        }
    }
}
