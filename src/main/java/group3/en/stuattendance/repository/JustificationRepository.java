package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Justification;
import group3.en.stuattendance.model.Student;
import group3.en.stuattendance.model.enums.JustificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JustificationRepository extends JpaRepository<Justification, Integer> {
    List<Justification> findByStudent(Student student);
    List<Justification> findByStatus(JustificationStatus status);

    @Query("SELECT j FROM Justification j WHERE j.status = 'PENDING' " +
            "ORDER BY j.createdAt ASC")
    List<Justification> findPendingJustifications();
}
