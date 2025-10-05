package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Integer> {
    Optional<Teacher> findByJoinCode(String joinCode);

    @Query("SELECT t FROM Teacher t JOIN t.courses c WHERE c.courseId = :courseId")
    Optional<Teacher> findByCourseId(@Param("courseId") Integer courseId);
}

