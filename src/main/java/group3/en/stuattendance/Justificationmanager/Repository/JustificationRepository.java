package group3.en.stuattendance.Justificationmanager.Repository;

import group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JustificationRepository extends JpaRepository<Justification, Integer> {

    Page<Justification> findAll(Pageable pageable);

    Page<Justification> findByStatus(JustificationStatus status, Pageable pageable);

    Page<Justification> findByUserUserId(Integer userId, Pageable pageable);

    Page<Justification> findByUserUserIdAndStatus(Integer userId, JustificationStatus status, Pageable pageable);

    long countByStatus(JustificationStatus status);

    long countByUserUserId(Integer userId);
}