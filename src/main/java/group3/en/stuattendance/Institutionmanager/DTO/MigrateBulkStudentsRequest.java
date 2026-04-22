package group3.en.stuattendance.Institutionmanager.DTO;

import java.util.List;

public class MigrateBulkStudentsRequest {

    private List<Integer> studentIds;   // Selected students to migrate
    private Integer fromClassroomId;    // The current classroom
    private Integer toClassroomId;      // The target classroom (can be auto-resolved)
    private boolean autoNextLevel;      // If true, system finds the next level automatically
    private Long academicYearId;        // The academic year of the target classroom
    private String reason;              // Optional reason/note

    public MigrateBulkStudentsRequest() {}

    public List<Integer> getStudentIds() { return studentIds; }
    public void setStudentIds(List<Integer> studentIds) { this.studentIds = studentIds; }

    public Integer getFromClassroomId() { return fromClassroomId; }
    public void setFromClassroomId(Integer fromClassroomId) { this.fromClassroomId = fromClassroomId; }

    public Integer getToClassroomId() { return toClassroomId; }
    public void setToClassroomId(Integer toClassroomId) { this.toClassroomId = toClassroomId; }

    public boolean isAutoNextLevel() { return autoNextLevel; }
    public void setAutoNextLevel(boolean autoNextLevel) { this.autoNextLevel = autoNextLevel; }

    public Long getAcademicYearId() { return academicYearId; }
    public void setAcademicYearId(Long academicYearId) { this.academicYearId = academicYearId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}