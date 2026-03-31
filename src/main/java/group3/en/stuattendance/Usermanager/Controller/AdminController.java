package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto;
import group3.en.stuattendance.Usermanager.DTO.StaffCreateDto;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;
    private final group3.en.stuattendance.Usermanager.Service.PermissionService permissionService;
    private final group3.en.stuattendance.Usermanager.Mapper.UserMapper userMapper;
    private final group3.en.stuattendance.Usermanager.Service.EmailService emailService;
    private final group3.en.stuattendance.Usermanager.Repository.PasswordResetRequestRepository passwordResetRequestRepository;

    @PutMapping("/users/{id}/roles")
    public ResponseEntity<Void> updateUserRoles(@PathVariable Integer id, @RequestBody Set<Integer> roleIds) {

        // Fixed: getUserById returns UserDto directly (no Optional)
        UserDto existingDto = userService.getUserById(id);

        UserDto dto = UserDto.builder()
                .userId(existingDto.getUserId())           // Keep the ID
                .username(existingDto.getUsername())
                .email(existingDto.getEmail())
                .roleIds(roleIds)
                .isActive(existingDto.getIsActive())
                .build();

        userService.updateUser(id, dto);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/staff")
    public ResponseEntity<UserDto> registerStaff(@RequestBody StaffCreateDto dto) {
        // Fixed: service already returns UserDto, no need for userMapper.toDto()
        return ResponseEntity.ok(userService.registerStaff(dto));
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
    public ResponseEntity<Void> handleResetRequest(@PathVariable Integer id,
                                                   @RequestParam String action,
                                                   @RequestBody(required = false) String newPassword) {

        // Fixed: proper Optional handling
        group3.en.stuattendance.Usermanager.Model.PasswordResetRequest request =
                passwordResetRequestRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("Request not found"));

        if ("APPROVE".equalsIgnoreCase(action)) {
            userService.resetPassword(request.getUser().getUserId(), newPassword);

            String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();

            // Fixed: getUserByUsername returns Optional<User>
            User admin = userService.getUserByUsername(adminUsername)
                    .orElseThrow(() -> new RuntimeException("Admin not found"));

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
    public ResponseEntity<BulkImportResultDto> bulkImportStaff(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.ok(userService.bulkImportStaff(file));
    }
}