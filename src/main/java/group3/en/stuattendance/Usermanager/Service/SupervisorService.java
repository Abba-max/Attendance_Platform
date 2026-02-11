package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.SupervisorDto;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import group3.en.stuattendance.Usermanager.Model.Supervisor;

import java.util.List;

public interface SupervisorService {
    Supervisor registerSupervisor(SupervisorDto dto);
    Supervisor getSupervisorById(Integer pedagogId);
    Supervisor getSupervisorByUserId(Integer userId);
    List<Supervisor> getAllPedagogs();
    void updateSupervisor(Integer supervisorId, SupervisorDto dto);
    List<Justification> getPendingJustifications();
    void approveJustification(Integer justificationId);
    void rejectJustification(Integer justificationId, String reason);
}
