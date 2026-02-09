package group3.en.stuattendance.Usermanager.Repository;

import group3.en.stuattendance.Usermanager.Model.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Integer> {
}