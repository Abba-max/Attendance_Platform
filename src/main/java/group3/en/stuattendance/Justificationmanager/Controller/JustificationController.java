package group3.en.stuattendance.Justificationmanager.Controller;

import group3.en.stuattendance.Justificationmanager.DTO.JustificationDto;
import group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus;
import group3.en.stuattendance.Justificationmanager.Service.JustificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails;
import java.util.Map;

@RestController
@RequestMapping("/api/justifications")
@RequiredArgsConstructor
public class JustificationController {

    private final JustificationService justificationService;

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<JustificationDto> createJustification(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestPart("justification") JustificationDto justificationDto,
            @RequestPart(value = "document", required = false) org.springframework.web.multipart.MultipartFile document) {
        
        // Security: Ensure student can only create for themselves
        justificationDto.setStudentId(userDetails.getUserId());
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(justificationService.createJustification(justificationDto, document));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'PEDAGOG')")
    public ResponseEntity<JustificationDto> getJustificationById(@PathVariable Integer id) {
        return ResponseEntity.ok(justificationService.getJustificationById(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('PEDAGOG')")
    public ResponseEntity<Page<JustificationDto>> getAllJustifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(justificationService.getAllJustifications(page, size, sortBy, sortDir));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('PEDAGOG')")
    public ResponseEntity<Page<JustificationDto>> getJustificationsByStatus(
            @PathVariable JustificationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(justificationService.getJustificationsByStatus(status, page, size, sortBy, sortDir));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<Page<JustificationDto>> getJustificationsByStudent(
            @PathVariable Integer studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(justificationService.getJustificationsByStudent(studentId, page, size, sortBy, sortDir));
    }

    @GetMapping("/student/{studentId}/status/{status}")
    public ResponseEntity<Page<JustificationDto>> getJustificationsByStudentAndStatus(
            @PathVariable Integer studentId,
            @PathVariable JustificationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(justificationService.getJustificationsByStudentAndStatus(studentId, status, page, size, sortBy, sortDir));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('PEDAGOG')")
    public ResponseEntity<JustificationDto> approveJustification(@PathVariable Integer id) {
        return ResponseEntity.ok(justificationService.approveJustification(id));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('PEDAGOG')")
    public ResponseEntity<JustificationDto> rejectJustification(
            @PathVariable Integer id,
            @RequestParam String reasonForRejection) {
        return ResponseEntity.ok(justificationService.rejectJustification(id, reasonForRejection));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJustification(@PathVariable Integer id) {
        justificationService.deleteJustification(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count/status/{status}")
    public ResponseEntity<Long> countByStatus(@PathVariable JustificationStatus status) {
        return ResponseEntity.ok(justificationService.countByStatus(status));
    }

    @GetMapping("/count/student/{studentId}")
    public ResponseEntity<Long> countByStudent(@PathVariable Integer studentId) {
        return ResponseEntity.ok(justificationService.countByStudent(studentId));
    }
}