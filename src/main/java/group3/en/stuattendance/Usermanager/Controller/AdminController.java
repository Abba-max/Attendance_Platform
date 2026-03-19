package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;
    private final group3.en.stuattendance.Usermanager.Service.PermissionService permissionService;
    private final group3.en.stuattendance.Usermanager.Mapper.UserMapper userMapper;

    @GetMapping("/users")
    public ResponseEntity<Page<UserDto>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ?
                Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(userService.getAllUsersPaginated(pageable));
    }

    @GetMapping("/staff")
    public ResponseEntity<Page<UserDto>> getAllStaff(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(userService.getAllStaffPaginated(pageable));
    }

    @PutMapping("/users/{id}/roles")
    public ResponseEntity<Void> updateUserRoles(
            @PathVariable Integer id,
            @RequestBody Set<Integer> roleIds) {
        UserDto existingUser = userService.getUserById(id);
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
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.registerStaff(dto));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<Void> toggleStatus(
            @PathVariable Integer id,
            @RequestParam Boolean active) {
        if (active) {
            userService.activateUser(id);
        } else {
            userService.deactivateUser(id);
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable Integer id,
            @RequestBody String newPassword) {
        userService.resetPassword(id, newPassword);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{id}/permissions/grant/{permissionId}")
    public ResponseEntity<Void> grantPermission(
            @PathVariable Integer id,
            @PathVariable Integer permissionId) {
        userService.grantPermission(id, permissionId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{id}/permissions/revoke/{permissionId}")
    public ResponseEntity<Void> revokePermission(
            @PathVariable Integer id,
            @PathVariable Integer permissionId) {
        userService.revokePermission(id, permissionId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/users/{id}/permissions/clear")
    public ResponseEntity<Void> clearPermissions(@PathVariable Integer id) {
        userService.clearPermissionOverrides(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{id}/permissions/clear/{permissionId}")
    public ResponseEntity<Void> clearSinglePermission(
            @PathVariable Integer id,
            @PathVariable Integer permissionId) {
        userService.clearPermissionOverride(id, permissionId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/staff/bulk-import")
    public ResponseEntity<group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto> bulkImportStaff(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userService.bulkImportStaff(file));
    }
}