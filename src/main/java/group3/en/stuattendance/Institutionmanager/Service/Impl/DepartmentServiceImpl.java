package group3.en.stuattendance.Institutionmanager.Service.Impl;

import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Repository.DepartmentRepository;
import group3.en.stuattendance.Institutionmanager.Service.DepartmentService;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class DepartmentServiceImpl implements DepartmentService {

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    public Department save(Department department) {
        return departmentRepository.save(department);
    }

    @Override
    public Department findById(Integer id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));
    }

    @Override
    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    @Override
    public void assignStaffToDepartment(Integer departmentId, Integer pedagogicAssistantId, Set<Integer> supervisorIds) {
        Department department = findById(departmentId);

        // Assign PA
        if (pedagogicAssistantId != null) {
            User pa = userRepository.findById(pedagogicAssistantId)
                    .orElseThrow(() -> new RuntimeException("Pedagogic Assistant not found with id: " + pedagogicAssistantId));
            department.setPedagogicAssistant(pa);
        } else {
            department.setPedagogicAssistant(null);
        }

        // Assign Supervisors
        if (supervisorIds != null) {
            Set<User> supervisors = new HashSet<>();
            for (Integer supId : supervisorIds) {
                User supervisor = userRepository.findById(supId)
                        .orElseThrow(() -> new RuntimeException("Supervisor not found with id: " + supId));
                supervisors.add(supervisor);
            }
            department.setSupervisors(supervisors);
        } else {
            department.getSupervisors().clear();
        }

        departmentRepository.save(department);
    }

    @Override
    public List<Department> findByCycleId(Integer cycleId) {
        return departmentRepository.findByCycle_CycleId(cycleId);
    }

    @Override
    public void deleteById(Integer id) {
        departmentRepository.deleteById(id);
    }
}