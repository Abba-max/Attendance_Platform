package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.DTO.AttachmentDto;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import group3.en.stuattendance.Usermanager.Service.EmailService;
import group3.en.stuattendance.Notificationmanager.Service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
@Slf4j
public class AnnouncementController {

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @PostMapping("/send")
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG', 'ADMIN')")
    public ResponseEntity<?> sendAnnouncement(
            @RequestParam("targetType") String targetType,
            @RequestParam(value = "classroomId", required = false) Integer classroomId,
            @RequestParam(value = "recipientIds", required = false) List<Integer> recipientIds,
            @RequestParam("subject") String subject,
            @RequestParam("content") String content,
            @RequestParam(value = "files", required = false) MultipartFile[] files) {

        log.info("Received request to send announcement. Target: {}, ClassroomId: {}", targetType, classroomId);

        // 1. Resolve current sender details
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String senderEmail = null;
        String senderName = "Administration";
        boolean isTeacher = false;
        if (auth != null && auth.isAuthenticated()) {
            User currentUser = userRepository.findByUsername(auth.getName()).orElse(null);
            if (currentUser != null) {
                senderEmail = currentUser.getEmail();
                senderName = currentUser.getFirstName() + " " + currentUser.getLastName();
            }
            isTeacher = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));
        }

        // 2. Validate Teacher target restrictions
        if (isTeacher) {
            String targetTypeUpper = targetType.toUpperCase();
            if ("ALL".equals(targetTypeUpper) || "TEACHERS".equals(targetTypeUpper) || "PEDAGOGS".equals(targetTypeUpper) || "STUDENTS".equals(targetTypeUpper)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Teachers are not authorized to send to global target groups."));
            }
        }

        // 3. Resolve target recipients
        List<User> targets = new ArrayList<>();
        switch (targetType.toUpperCase()) {
            case "ALL":
                targets.addAll(userRepository.findByRolesName("STUDENT"));
                targets.addAll(userRepository.findByRolesName("TEACHER"));
                targets.addAll(userRepository.findByRolesName("PEDAGOG"));
                break;
            case "STUDENTS":
                targets = userRepository.findByRolesName("STUDENT");
                break;
            case "TEACHERS":
                targets = userRepository.findByRolesName("TEACHER");
                break;
            case "PEDAGOGS":
                targets = userRepository.findByRolesName("PEDAGOG");
                break;
            case "CLASS":
                if (classroomId == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Classroom ID is required for targetType CLASS"));
                }
                targets = userRepository.findByClassroomClassId(classroomId);
                break;
            case "DELEGATES":
                if (classroomId != null) {
                    targets = userRepository.findByClassroomClassIdAndIsDelegateTrue(classroomId);
                } else {
                    targets = userRepository.findByRolesName("STUDENT").stream()
                            .filter(User::getIsDelegate)
                            .collect(Collectors.toList());
                }
                break;
            case "SPECIFIC":
                if (recipientIds == null || recipientIds.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Recipient IDs are required for targetType SPECIFIC"));
                }
                targets = userRepository.findAllById(recipientIds);
                break;
            default:
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid targetType: " + targetType));
        }

        if (targets.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No recipient students/staff found for target selection."));
        }

        // 4. Extract valid emails
        List<String> emails = targets.stream()
                .map(User::getEmail)
                .filter(email -> email != null && !email.trim().isEmpty())
                .collect(Collectors.toList());

        if (emails.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No recipients have valid email addresses."));
        }

        // 5. Process attachments into DTOs to make it safe for async execution
        List<AttachmentDto> attachments = new ArrayList<>();
        if (files != null) {
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    try {
                        attachments.add(AttachmentDto.builder()
                                .filename(file.getOriginalFilename())
                                .data(file.getBytes())
                                .contentType(file.getContentType())
                                .build());
                    } catch (IOException e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "Failed to read attachment file: " + file.getOriginalFilename()));
                    }
                }
            }
        }

        // 6. Send Email async
        emailService.sendAnnouncementEmail(senderEmail, emails, subject, content, attachments, senderName);

        // 7. Dispatch persistent and real-time notifications
        String attachmentNames = "";
        if (!attachments.isEmpty()) {
            attachmentNames = " (attached: " + attachments.stream()
                    .map(AttachmentDto::getFilename)
                    .collect(Collectors.joining(", ")) + ")";
        }
        String notificationMessage = "[" + senderName + "] " + subject + attachmentNames + " - " + 
                (content.length() > 200 ? content.substring(0, 200) + "..." : content);

        for (User target : targets) {
            try {
                notificationService.sendNotification(target.getUserId(), "ANNOUNCEMENT", notificationMessage);
            } catch (Exception e) {
                log.error("Failed to send notification to user: " + target.getUserId(), e);
            }
        }

        return ResponseEntity.ok(Map.of("message", "Announcement successfully dispatched to " + emails.size() + " recipients."));
    }
}
