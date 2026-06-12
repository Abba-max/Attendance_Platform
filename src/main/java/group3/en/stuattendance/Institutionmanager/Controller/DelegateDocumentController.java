package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.DelegateDocument;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Repository.DelegateDocumentRepository;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DelegateDocumentController {

    private final DelegateDocumentRepository delegateDocumentRepository;
    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;

    private static final String UPLOAD_DIR = "uploads/documents/";

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG', 'ADMIN')")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("classroomId") Integer classroomId,
            @RequestParam(value = "courseId", required = false) Integer courseId) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        // Get Current Logged-in User
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("Current user not found"));

        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));

        Course course = null;
        if (courseId != null) {
            course = courseRepository.findById(courseId).orElse(null);
        }

        try {
            // Ensure Upload Directory Exists
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // Create Unique Filename
            String originalFileName = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            String uniqueFileName = UUID.randomUUID().toString() + fileExtension;
            Path filePath = Paths.get(UPLOAD_DIR + uniqueFileName);

            // Copy file to Target Location
            Files.copy(file.getInputStream(), filePath);

            // Create Entity
            DelegateDocument doc = DelegateDocument.builder()
                    .title(title)
                    .fileName(originalFileName)
                    .filePath(filePath.toString())
                    .classroom(classroom)
                    .teacher(currentUser)
                    .course(course)
                    .uploadDate(LocalDateTime.now())
                    .build();

            DelegateDocument savedDoc = delegateDocumentRepository.save(doc);

            return ResponseEntity.status(HttpStatus.CREATED).body(savedDoc);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to store file: " + e.getMessage());
        }
    }

    @GetMapping("/my-uploads")
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG', 'ADMIN')")
    public ResponseEntity<List<DelegateDocument>> getMyUploads(
            @RequestParam(required = false) Integer courseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("Current user not found"));

        List<DelegateDocument> docs = delegateDocumentRepository.findByTeacher_UserId(currentUser.getUserId());
        if (courseId != null) {
            docs = docs.stream().filter(d -> d.getCourse() != null && d.getCourse().getCourseId().equals(courseId)).toList();
        }
        if (date != null) {
            docs = docs.stream().filter(d -> d.getUploadDate().toLocalDate().equals(date)).toList();
        }
        return ResponseEntity.ok(docs);
    }

    @GetMapping("/classroom/{classroomId}")
    public ResponseEntity<List<DelegateDocument>> getClassroomDocuments(
            @PathVariable Integer classroomId,
            @RequestParam(required = false) Integer teacherId,
            @RequestParam(required = false) Integer courseId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDateTime startDate = null;
        LocalDateTime endDate = null;

        if (date != null) {
            startDate = date.atStartOfDay();
            endDate = date.atTime(LocalTime.MAX);
        }

        List<DelegateDocument> docs = delegateDocumentRepository.findDocuments(
                classroomId, teacherId, courseId, search, startDate, endDate);

        return ResponseEntity.ok(docs);
    }

    @GetMapping("/download/{documentId}")
    public ResponseEntity<?> downloadDocument(@PathVariable Integer documentId) {
        DelegateDocument doc = delegateDocumentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        try {
            Path path = Paths.get(doc.getFilePath());
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() || resource.isReadable()) {
                String contentType = Files.probeContentType(path);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFileName() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("File not readable");
            }

        } catch (MalformedURLException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error determining file type: " + e.getMessage());
        }
    }

    @DeleteMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG', 'ADMIN')")
    public ResponseEntity<?> deleteDocument(@PathVariable Integer documentId) {
        DelegateDocument doc = delegateDocumentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Security check: only the teacher who uploaded, or pedagog/admin can delete
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("Current user not found"));

        boolean isAdminOrPedagog = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_PEDAGOG"));

        if (!currentUser.getUserId().equals(doc.getTeacher().getUserId()) && !isAdminOrPedagog) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to delete this document.");
        }

        try {
            // Delete Physical File
            Path path = Paths.get(doc.getFilePath());
            Files.deleteIfExists(path);

            // Delete Entity
            delegateDocumentRepository.delete(doc);

            return ResponseEntity.ok().body("Document deleted successfully");
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete physical file: " + e.getMessage());
        }
    }
}
