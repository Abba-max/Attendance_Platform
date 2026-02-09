package group3.en.stuattendance.Usermanager.Repository;

import group3.en.stuattendance.Usermanager.Model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentRepository extends JpaRepository<Student, Integer> {
}