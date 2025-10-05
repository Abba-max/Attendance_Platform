package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Student;
import group3.en.stuattendance.model.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Integer> {
    Optional<Student> findByMatricule(String matricule);
    List<Student> findByClassroom(Classroom classroom);

    @Query("SELECT s FROM Student s WHERE s.classroom.classId = :classroomId")
    List<Student> findAllByClassroomId(@Param("classroomId") Integer classroomId);

    @Query("SELECT s FROM Student s WHERE s.username LIKE %:search% OR s.matricule LIKE %:search%")
    List<Student> searchStudents(@Param("search") String search);
}
