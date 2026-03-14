package group3.en.stuattendance.Usermanager.Repository;

import group3.en.stuattendance.Usermanager.Model.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Integer> {
    List<PasswordResetRequest> findByStatus(PasswordResetRequest.RequestStatus status);
}
