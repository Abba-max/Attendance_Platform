package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.DTO.PermissionDto;
import group3.en.stuattendance.Usermanager.Model.Permission;
import group3.en.stuattendance.Usermanager.Service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<List<Permission>> getAllPermissions() {
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }

    @PostMapping
    public ResponseEntity<Permission> createPermission(@RequestBody PermissionDto dto) {
        return ResponseEntity.ok(permissionService.createPermission(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Permission> updatePermission(@PathVariable Integer id, @RequestBody PermissionDto dto) {
        return ResponseEntity.ok(permissionService.updatePermission(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePermission(@PathVariable Integer id) {
        permissionService.deletePermission(id);
        return ResponseEntity.ok().build();
    }
}
