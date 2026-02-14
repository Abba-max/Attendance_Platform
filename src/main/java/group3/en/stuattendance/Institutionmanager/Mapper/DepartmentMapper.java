package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.DepartmentDto;
import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import org.springframework.stereotype.Component;

@Component
public class DepartmentMapper {

    public DepartmentDto toDto(Department department) {
        if (department == null) return null;
        return DepartmentDto.builder()
                .departmentId(department.getDepartmentId())
                .name(department.getName())
                .cycleId(department.getCycle() != null ? department.getCycle().getCycleId() : null)
                .build();
    }

    public Department toEntity(DepartmentDto dto, Cycle cycle) {
        if (dto == null) return null;
        return Department.builder()
                .departmentId(dto.getDepartmentId())
                .name(dto.getName())
                .cycle(cycle)
                .build();
    }
}
