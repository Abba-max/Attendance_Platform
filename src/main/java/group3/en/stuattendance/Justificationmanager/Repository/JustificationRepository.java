package group3.en.stuattendance.Justificationmanager.Repository;

import group3.en.stuattendance.Justificationmanager.Model.Justification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JustificationRepository extends JpaRepository<Justification, Integer> {
}