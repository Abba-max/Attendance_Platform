package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.Model.Department;
import java.util.List;

public interface DepartmentService {
    Department save(Department department);
    Department findById(Integer id);
    List<Department> getAllDepartments();
    void assignStaffToDepartment(Integer departmentId, java.util.Set<Integer> pedagogicAssistantIds, java.util.Set<Integer> supervisorIds);
    List<Department> findByCycleId(Integer cycleId);
    group3.en.stuattendance.Institutionmanager.DTO.DepartmentDto getDepartmentDtoById(Integer id);
    void deleteById(Integer id);
}