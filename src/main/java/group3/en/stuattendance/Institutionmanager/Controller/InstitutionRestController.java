package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.InstitutionDto;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Institutionmanager.Service.InstitutionService;
import group3.en.stuattendance.Institutionmanager.Mapper.InstitutionMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/institutions")
@PreAuthorize("hasRole('ADMIN')")
public class InstitutionRestController {

    @Autowired
    private InstitutionService institutionService;

    @Autowired
    private InstitutionMapper institutionMapper;

    @GetMapping("/{id}")
    public ResponseEntity<InstitutionDto> getInstitution(@PathVariable Integer id) {
        Institution inst = institutionService.findById(id);
        return ResponseEntity.ok(institutionMapper.toDto(inst));
    }

    @GetMapping("/{id}/geofence")
    public ResponseEntity<InstitutionDto> getInstitutionGeofence(@PathVariable Integer id) {
        Institution inst = institutionService.findById(id);
        return ResponseEntity.ok(institutionMapper.toDto(inst));
    }

    @PostMapping("/{id}/geofence")
    public ResponseEntity<?> updateGeofence(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> payload) {
        try {
            Institution inst = institutionService.findById(id);
            if (payload.containsKey("geofenceData")) {
                inst.setGeofenceData((String) payload.get("geofenceData"));
            }
            if (payload.containsKey("geofencingEnabled")) {
                inst.setGeofencingEnabled((Boolean) payload.get("geofencingEnabled"));
            }
            institutionService.save(inst);
            return ResponseEntity.ok(Map.of("message", "Geofence updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
