package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
// @PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final group3.en.stuattendance.Usermanager.Service.PermissionService permissionService;
    private final group3.en.stuattendance.Usermanager.Mapper.UserMapper userMapper;
    private final group3.en.stuattendance.Usermanager.Service.EmailService emailService;
    private final group3.en.stuattendance.Usermanager.Repository.PasswordResetRequestRepository passwordResetRequestRepository;

    @PutMapping("/users/{id}/roles")
    public ResponseEntity<Void> updateUserRoles(@PathVariable Integer id, @RequestBody java.util.Set<Integer> roleIds) {
        User existingUser = userService.getUserById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        UserDto dto = UserDto.builder()
            .username(existingUser.getUsername())
            .email(existingUser.getEmail())
            .roleIds(roleIds)
            .isActive(existingUser.getIsActive())
            .build();
            
        userService.updateUser(id, dto);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/staff")
    public ResponseEntity<UserDto> registerStaff(
        @RequestBody group3.en.stuattendance.Usermanager.DTO.StaffCreateDto dto) {
        return ResponseEntity.ok(userMapper.toDto(userService.registerStaff(dto)));
    }

    @GetMapping("/staff")
    public ResponseEntity<List<UserDto>> getAllStaff() {
        return ResponseEntity.ok(userService.getAllStaffDtos());
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUserDtos());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<Void> toggleStatus(@PathVariable Integer id, @RequestParam Boolean active) {
        if (active) {
            userService.activateUser(id);
        } else {
            userService.deactivateUser(id);
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/password-requests/{id}")
    public ResponseEntity<Void> handleResetRequest(@PathVariable Integer id, @RequestParam String action, @RequestBody(required = false) String newPassword) {
        group3.en.stuattendance.Usermanager.Model.PasswordResetRequest request = 
            passwordResetRequestRepository.findById(id).orElseThrow(() -> new RuntimeException("Request not found"));
        
        if ("APPROVE".equalsIgnoreCase(action)) {
            userService.resetPassword(request.getUser().getUserId(), newPassword);
            
            String adminUsername = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            User admin = userService.getUserByUsername(adminUsername).orElseThrow();
            
            emailService.sendPasswordResetNotification(
                request.getUser().getEmail(),
                newPassword,
                admin.getEmail(),
                admin.getFirstName() + " " + admin.getLastName()
            );
            
            request.setStatus(group3.en.stuattendance.Usermanager.Model.PasswordResetRequest.RequestStatus.COMPLETED);
        } else {
            request.setStatus(group3.en.stuattendance.Usermanager.Model.PasswordResetRequest.RequestStatus.REJECTED);
        }
        
        passwordResetRequestRepository.save(request);
        return ResponseEntity.ok().build();
    }

    // Per-User Permission Overrides
    @PostMapping("/users/{id}/permissions/grant/{permissionId}")
    public ResponseEntity<Void> grantPermission(@PathVariable Integer id, @PathVariable Integer permissionId) {
        userService.grantPermission(id, permissionId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{id}/permissions/revoke/{permissionId}")
    public ResponseEntity<Void> revokePermission(@PathVariable Integer id, @PathVariable Integer permissionId) {
        userService.revokePermission(id, permissionId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/users/{id}/permissions/clear")
    public ResponseEntity<Void> clearPermissions(@PathVariable Integer id) {
        userService.clearPermissionOverrides(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{id}/permissions/clear/{permissionId}")
    public ResponseEntity<Void> clearSinglePermission(@PathVariable Integer id, @PathVariable Integer permissionId) {
        userService.clearPermissionOverride(id, permissionId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/staff/bulk-import")
    public ResponseEntity<group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto> bulkImportStaff(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.ok(userService.bulkImportStaff(file));
    }
}
