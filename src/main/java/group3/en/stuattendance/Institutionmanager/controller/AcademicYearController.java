package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearDto;
import group3.en.stuattendance.Institutionmanager.Service.AcademicYearService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/academic-years")
@RequiredArgsConstructor
public class AcademicYearController {

    private final AcademicYearService academicYearService;

    @PostMapping
    public ResponseEntity<AcademicYearDto> createAcademicYear(@RequestBody AcademicYearDto dto) {
        return ResponseEntity.ok(academicYearService.createAcademicYear(dto));
    }

    @GetMapping("/active")
    public ResponseEntity<AcademicYearDto> getActiveAcademicYear() {
        AcademicYearDto active = academicYearService.getActiveAcademicYear();
        return active != null ? ResponseEntity.ok(active) : ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<AcademicYearDto>> getAllAcademicYears() {
        return ResponseEntity.ok(academicYearService.getAllAcademicYears());
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<AcademicYearDto> activateAcademicYear(@PathVariable Long id) {
        return ResponseEntity.ok(academicYearService.activateAcademicYear(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAcademicYear(@PathVariable Long id) {
        academicYearService.deleteAcademicYear(id);
        return ResponseEntity.noContent().build();
    }
}
