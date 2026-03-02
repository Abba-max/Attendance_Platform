package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.SpecialityDto;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Model.Speciality;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class SpecialityMapper {

    private final ClassroomMapper classroomMapper;

    public SpecialityDto toDto(Speciality speciality) {
        if (speciality == null) return null;
        return SpecialityDto.builder()
                .specialityId(speciality.getSpecialityId())
                .name(speciality.getName())
                .description(speciality.getDescription())
                .departmentId(speciality.getDepartment() != null ? speciality.getDepartment().getDepartmentId() : null)
                .classrooms(speciality.getClassrooms() != null ? 
                        speciality.getClassrooms().stream()
                                .map(classroomMapper::toDto)
                                .collect(Collectors.toSet()) : new java.util.HashSet<>())
                .build();
    }

    public Speciality toEntity(SpecialityDto dto, Department department) {
        if (dto == null) return null;
        return Speciality.builder()
                .specialityId(dto.getSpecialityId())
                .name(dto.getName())
                .description(dto.getDescription())
                .department(department)
                .build();
    }
}
