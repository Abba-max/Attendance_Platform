package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.Speciality;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

import java.util.List;

@Repository
public interface SpecialityRepository extends JpaRepository<Speciality, Integer> {
    List<Speciality> findByDepartment_DepartmentId(Integer departmentId);
    List<Speciality> findByDepartmentIn(java.util.List<group3.en.stuattendance.Institutionmanager.Model.Department> departments);
    Optional<Speciality> findByName(String name);
    boolean existsByName(String name);
}

