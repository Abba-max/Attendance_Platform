package group3.en.stuattendance.Usermanager.Mapper;

import group3.en.stuattendance.Usermanager.DTO.StudentDto;
import group3.en.stuattendance.Usermanager.Model.Student;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import org.springframework.stereotype.Component;

@Component
public class StudentMapper {

    public StudentDto toDto(Student student) {
        if (student == null) return null;
        return StudentDto.builder()
                .userId(student.getUserId())
                .username(student.getUsername())
                .email(student.getEmail())
                .isActive(student.getIsActive())
                .matricule(student.getMatricule())
                .externalEmail(student.getExternalEmail())
                .classroomId(student.getClassroom() != null ? student.getClassroom().getClassId() : null)
                .institutionId(student.getInstitution() != null ? student.getInstitution().getInstitutionId() : null)
                .build();
    }

    public Student toEntity(StudentDto dto, Institution institution, Classroom classroom) {
        if (dto == null) return null;
        Student student = new Student();
        student.setUserId(dto.getUserId());
        student.setUsername(dto.getUsername());
        student.setEmail(dto.getEmail());
        student.setIsActive(dto.getIsActive());
        student.setMatricule(dto.getMatricule());
        student.setExternalEmail(dto.getExternalEmail());
        student.setInstitution(institution);
        student.setClassroom(classroom);
        return student;
    }
}
