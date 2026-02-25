package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.ClassroomDto;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Speciality;
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
                .specialityId(classroom.getSpeciality() != null ? classroom.getSpeciality().getSpecialityId() : null)
                .specialityName(classroom.getSpeciality() != null ? classroom.getSpeciality().getName() : null)
                .departmentId(classroom.getSpeciality() != null && classroom.getSpeciality().getDepartment() != null
                        ? classroom.getSpeciality().getDepartment().getDepartmentId() : null)
                .studentCount(classroom.getStudents() != null ? classroom.getStudents().size() : 0)
                .build();
    }

    public Classroom toEntity(ClassroomDto dto, Speciality speciality) {
        if (dto == null) return null;
        return Classroom.builder()
                .classId(dto.getClassId())
                .name(dto.getName())
                .level(dto.getLevel() != null ? Integer.parseInt(dto.getLevel()) : null)
                .capacity(dto.getCapacity())
                .speciality(speciality)
                .build();
    }
}
