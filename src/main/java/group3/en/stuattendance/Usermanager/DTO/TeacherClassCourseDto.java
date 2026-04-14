package group3.en.stuattendance.Usermanager.DTO;

public class TeacherClassCourseDto {
    private Integer classroomId;
    private String classroomName;
    private Integer courseId;
    private String courseName;
    
    public TeacherClassCourseDto() {}
    
    public TeacherClassCourseDto(Integer classroomId, String classroomName, Integer courseId, String courseName) {
        this.classroomId = classroomId;
        this.classroomName = classroomName;
        this.courseId = courseId;
        this.courseName = courseName;
    }

    public Integer getClassroomId() { return classroomId; }
    public void setClassroomId(Integer classroomId) { this.classroomId = classroomId; }
    public String getClassroomName() { return classroomName; }
    public void setClassroomName(String classroomName) { this.classroomName = classroomName; }
    public Integer getCourseId() { return courseId; }
    public void setCourseId(Integer courseId) { this.courseId = courseId; }
    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TeacherClassCourseDto that = (TeacherClassCourseDto) o;
        return java.util.Objects.equals(classroomId, that.classroomId) &&
               java.util.Objects.equals(courseId, that.courseId);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(classroomId, courseId);
    }
}
