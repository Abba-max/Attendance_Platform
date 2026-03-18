package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {
    java.util.List<Department> findByCycle_CycleId(Integer cycleId);
    java.util.List<Department> findByPedagogicAssistants_UserId(Integer userId);
}
