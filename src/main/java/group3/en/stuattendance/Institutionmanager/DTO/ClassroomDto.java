package group3.en.stuattendance.Institutionmanager.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ClassroomDto {

    private Integer classId;

    @NotBlank(message = "Field is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @NotBlank(message = "Level is required")
    @Size(max = 50, message = "Level must not exceed 50 characters")
    private String level;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;

    @NotNull(message = "Speciality ID is required")
    private Integer specialityId;

    private String field;
    private Integer institutionId;

    // Read-only display fields populated by mapper
    private String specialityName;
    private Integer departmentId;
    private Integer studentCount;

    // No-args constructor
    public ClassroomDto() {}

    // All-args constructor
    public ClassroomDto(Integer classId, String name, String level, Integer capacity,
                        Integer specialityId, String field, Integer institutionId,
                        String specialityName, Integer departmentId, Integer studentCount) {
        this.classId = classId;
        this.name = name;
        this.level = level;
        this.capacity = capacity;
        this.specialityId = specialityId;
        this.field = field;
        this.institutionId = institutionId;
        this.specialityName = specialityName;
        this.departmentId = departmentId;
        this.studentCount = studentCount;
    }

    // Getters
    public Integer getClassId() { return classId; }
    public String getName() { return name; }
    public String getLevel() { return level; }
    public Integer getCapacity() { return capacity; }
    public Integer getSpecialityId() { return specialityId; }
    public String getField() { return field; }
    public Integer getInstitutionId() { return institutionId; }
    public String getSpecialityName() { return specialityName; }
    public Integer getDepartmentId() { return departmentId; }
    public Integer getStudentCount() { return studentCount; }

    // Setters
    public void setClassId(Integer classId) { this.classId = classId; }
    public void setName(String name) { this.name = name; }
    public void setLevel(String level) { this.level = level; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public void setSpecialityId(Integer specialityId) { this.specialityId = specialityId; }
    public void setField(String field) { this.field = field; }
    public void setInstitutionId(Integer institutionId) { this.institutionId = institutionId; }
    public void setSpecialityName(String specialityName) { this.specialityName = specialityName; }
    public void setDepartmentId(Integer departmentId) { this.departmentId = departmentId; }
    public void setStudentCount(Integer studentCount) { this.studentCount = studentCount; }

    // Builder
    public static ClassroomDtoBuilder builder() { return new ClassroomDtoBuilder(); }

    public static class ClassroomDtoBuilder {
        private Integer classId;
        private String name;
        private String level;
        private Integer capacity;
        private Integer specialityId;
        private String field;
        private Integer institutionId;
        private String specialityName;
        private Integer departmentId;
        private Integer studentCount;

        public ClassroomDtoBuilder classId(Integer classId) { this.classId = classId; return this; }
        public ClassroomDtoBuilder name(String name) { this.name = name; return this; }
        public ClassroomDtoBuilder level(String level) { this.level = level; return this; }
        public ClassroomDtoBuilder capacity(Integer capacity) { this.capacity = capacity; return this; }
        public ClassroomDtoBuilder specialityId(Integer specialityId) { this.specialityId = specialityId; return this; }
        public ClassroomDtoBuilder field(String field) { this.field = field; return this; }
        public ClassroomDtoBuilder institutionId(Integer institutionId) { this.institutionId = institutionId; return this; }
        public ClassroomDtoBuilder specialityName(String specialityName) { this.specialityName = specialityName; return this; }
        public ClassroomDtoBuilder departmentId(Integer departmentId) { this.departmentId = departmentId; return this; }
        public ClassroomDtoBuilder studentCount(Integer studentCount) { this.studentCount = studentCount; return this; }

        public ClassroomDto build() {
            return new ClassroomDto(classId, name, level, capacity, specialityId, field,
                    institutionId, specialityName, departmentId, studentCount);
        }
    }
}
