package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.Model.Department;
import java.util.List;

public interface DepartmentService {
    Department save(Department department);
    Department findById(Integer id);
    List<Department> getAllDepartments();
    void assignStaffToDepartment(Integer departmentId, Integer pedagogicAssistantId, java.util.Set<Integer> supervisorIds);
    void deleteById(Integer id);
}