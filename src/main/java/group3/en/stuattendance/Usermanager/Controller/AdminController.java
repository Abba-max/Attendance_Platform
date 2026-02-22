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
    public ResponseEntity<User> registerStaff(
        @RequestBody group3.en.stuattendance.Usermanager.DTO.StaffCreateDto dto) {
        return ResponseEntity.ok(userService.registerStaff(dto));
    }

    @GetMapping("/staff")
    public ResponseEntity<List<User>> getAllStaff() {
        return ResponseEntity.ok(userService.getAllStaff());
    }


    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(@PathVariable Integer id, @RequestBody String newPassword) {
        userService.resetPassword(id, newPassword);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/staff/bulk-import")
    public ResponseEntity<group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto> bulkImportStaff(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.ok(userService.bulkImportStaff(file));
    }
}
