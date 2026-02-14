package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.ClassroomDto;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import org.springframework.stereotype.Component;

@Component
public class ClassroomMapper {

    public ClassroomDto toDto(Classroom classroom) {
        if (classroom == null) return null;
        return ClassroomDto.builder()
                .classId(classroom.getClassId())
                .name(classroom.getName())
                .level(classroom.getLevel() != null ? classroom.getLevel().toString() : null)
                .capacity(classroom.getCapacity())
                .departmentId(classroom.getDepartment() != null ? classroom.getDepartment().getDepartmentId() : null)
                .build();
    }

    public Classroom toEntity(ClassroomDto dto, Department department) {
        if (dto == null) return null;
        return Classroom.builder()
                .classId(dto.getClassId())
                .name(dto.getName())
                .level(dto.getLevel() != null ? Integer.parseInt(dto.getLevel()) : null)
                .capacity(dto.getCapacity())
                .department(department)
                .build();
    }
}
