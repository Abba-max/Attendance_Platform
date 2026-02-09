package group3.en.stuattendance.Usermanager.Mapper;

import group3.en.stuattendance.Usermanager.DTO.TeacherDto;
import group3.en.stuattendance.Usermanager.Model.Teacher;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import org.springframework.stereotype.Component;

@Component
public class TeacherMapper {

    public TeacherDto toDto(Teacher teacher) {
        if (teacher == null) return null;
        return TeacherDto.builder()
                .teacherId(teacher.getTeacherId())
                .username(teacher.getUsername())
                .email(teacher.getEmail())
                .isActive(teacher.getIsActive())
                .joinCode(teacher.getJoinCode())
                .institutionId(teacher.getInstitution() != null ? teacher.getInstitution().getInstitutionId() : null)
                .build();
    }

    public Teacher toEntity(TeacherDto dto, Institution institution) {
        if (dto == null) return null;
        Teacher teacher = new Teacher();
        teacher.setTeacherId(dto.getTeacherId());
        teacher.setUsername(dto.getUsername());
        teacher.setEmail(dto.getEmail());
        teacher.setIsActive(dto.getIsActive());
        teacher.setJoinCode(dto.getJoinCode());
        teacher.setInstitution(institution);
        return teacher;
    }
}
