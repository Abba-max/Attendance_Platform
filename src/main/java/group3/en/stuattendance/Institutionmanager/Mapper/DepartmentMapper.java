package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.DepartmentDto;
import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class DepartmentMapper {

    @Autowired
    private group3.en.stuattendance.Institutionmanager.Mapper.SpecialityMapper specialityMapper;

    public DepartmentDto toDto(Department department) {
        if (department == null) return null;
        return DepartmentDto.builder()
                .departmentId(department.getDepartmentId())
                .name(department.getName())
                .chief(department.getChief())
                .chief(department.getChief())
                .cycleId(department.getCycle() != null ? department.getCycle().getCycleId() : null)
                .pedagogicAssistantIds(department.getPedagogicAssistants() != null ? 
                    department.getPedagogicAssistants().stream().map(u -> u.getUserId()).collect(java.util.stream.Collectors.toSet()) : new java.util.HashSet<>())
                .supervisorIds(department.getSupervisors() != null ? 
                    department.getSupervisors().stream().map(u -> u.getUserId()).collect(java.util.stream.Collectors.toSet()) : new java.util.HashSet<>())
                .specialities(department.getSpecialities() != null ?
                    department.getSpecialities().stream().map(specialityMapper::toDto).collect(java.util.stream.Collectors.toSet()) : new java.util.HashSet<>())
                .build();
    }

    public Department toEntity(DepartmentDto dto, Cycle cycle) {
        if (dto == null) return null;
        return Department.builder()
                .departmentId(dto.getDepartmentId())
                .name(dto.getName())
                .chief(dto.getChief())
                .cycle(cycle)
                .build();
    }
}
