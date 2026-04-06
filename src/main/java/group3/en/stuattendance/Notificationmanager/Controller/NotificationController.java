package group3.en.stuattendance.Notificationmanager.Controller;

import group3.en.stuattendance.Notificationmanager.DTO.NotificationDto;
import group3.en.stuattendance.Notificationmanager.Service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificationDto>> getMyNotifications(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(notificationService.getUserNotifications(userDetails.getUserId()));
    }

    @PostMapping("/{notificationId}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable Integer notificationId) {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read."));
    }
}
