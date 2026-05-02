package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.Model.Institution;
import java.util.List;

public interface InstitutionService {
    Institution save(Institution institution);
    Institution findById(Integer id);
    List<Institution> getAllInstitutions();
    void deleteById(Integer id);
    group3.en.stuattendance.Institutionmanager.DTO.InstitutionDto getInstitutionDto(Integer id);
    void updateGeofence(Integer id, String geofenceData, boolean enabled);
}

