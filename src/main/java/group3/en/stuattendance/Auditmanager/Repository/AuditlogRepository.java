package group3.en.stuattendance.Auditmanager.Repository;

import group3.en.stuattendance.Auditmanager.Model.Auditlog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditlogRepository extends JpaRepository<Auditlog, Integer> {
}
