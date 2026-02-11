package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.PedagogDto;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import group3.en.stuattendance.Usermanager.Model.Pedagog;

import java.util.List;

public interface PedagogService {
    Pedagog registerPedagog(PedagogDto dto);
    Pedagog getPedagogById(Integer pedagogId);
    Pedagog getPedagogByUserId(Integer userId);
    List<Pedagog> getAllPedagogs();
    void updatePedagog(Integer pedagogId, PedagogDto dto);
    List<Justification> getPendingJustifications();
    void approveJustification(Integer justificationId);
    void rejectJustification(Integer justificationId, String reason);
}
