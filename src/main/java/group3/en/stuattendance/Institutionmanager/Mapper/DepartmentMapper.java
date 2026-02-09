package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.DepartmentDto;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import org.springframework.stereotype.Component;

@Component
public class DepartmentMapper {

    public DepartmentDto toDto(Department department) {
        if (department == null) return null;
        return DepartmentDto.builder()
                .departmentId(department.getDepartmentId())
                .name(department.getName())
                .build();
    }

    public Department toEntity(DepartmentDto dto) {
        if (dto == null) return null;
        return Department.builder()
                .departmentId(dto.getDepartmentId())
                .name(dto.getName())
                .build();
    }
}
