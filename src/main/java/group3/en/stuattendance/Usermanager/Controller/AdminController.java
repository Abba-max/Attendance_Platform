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
    private final group3.en.stuattendance.Usermanager.Service.RoleService roleService;

    @GetMapping("/roles")
    public ResponseEntity<List<group3.en.stuattendance.Usermanager.Model.Role>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @PostMapping("/roles")
    public ResponseEntity<group3.en.stuattendance.Usermanager.Model.Role> createRole(@RequestBody group3.en.stuattendance.Usermanager.DTO.RoleDto dto) {
        return ResponseEntity.ok(roleService.createRole(dto));
    }

    @PutMapping("/roles/{id}")
    public ResponseEntity<group3.en.stuattendance.Usermanager.Model.Role> updateRole(@PathVariable Integer id, @RequestBody group3.en.stuattendance.Usermanager.DTO.RoleDto dto) {
        return ResponseEntity.ok(roleService.updateRole(id, dto));
    }

    @DeleteMapping("/roles/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable Integer id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/permissions")
    public ResponseEntity<List<group3.en.stuattendance.Usermanager.Model.Permission>> getAllPermissions() {
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }

    @PostMapping("/permissions")
    public ResponseEntity<group3.en.stuattendance.Usermanager.Model.Permission> createPermission(@RequestBody group3.en.stuattendance.Usermanager.DTO.PermissionDto dto) {
        return ResponseEntity.ok(permissionService.createPermission(dto));
    }

    @PutMapping("/permissions/{id}")
    public ResponseEntity<group3.en.stuattendance.Usermanager.Model.Permission> updatePermission(@PathVariable Integer id, @RequestBody group3.en.stuattendance.Usermanager.DTO.PermissionDto dto) {
        return ResponseEntity.ok(permissionService.updatePermission(id, dto));
    }

    @DeleteMapping("/permissions/{id}")
    public ResponseEntity<Void> deletePermission(@PathVariable Integer id) {
        permissionService.deletePermission(id);
        return ResponseEntity.ok().build();
    }

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

    @PutMapping("/roles/{roleName}/permissions")
    public ResponseEntity<Void> syncRolePermissions(@PathVariable String roleName,
        @RequestBody java.util.Set<String> permissionNames) {
        permissionService.syncRolePermissions(roleName, permissionNames);
        return ResponseEntity.ok().build();
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
}
