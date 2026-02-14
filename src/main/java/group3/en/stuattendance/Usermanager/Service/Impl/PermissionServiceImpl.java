package group3.en.stuattendance.Usermanager.Service.Impl;

import group3.en.stuattendance.Usermanager.Model.Permission;
import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Repository.PermissionRepository;
import group3.en.stuattendance.Usermanager.Repository.RoleRepository;
import group3.en.stuattendance.Usermanager.Service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;

    @Override
    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }

    @Override
    public Set<Permission> getPermissionsByRole(String roleName) {
        return roleRepository.findByName(roleName)
                .map(Role::getPermissions)
                .orElse(new java.util.HashSet<>());
    }

    @Override
    public void addPermissionToRole(String roleName, String permissionName) {
        roleRepository.findByName(roleName).ifPresent(role -> {
            permissionRepository.findByName(permissionName).ifPresent(permission -> {
                role.getPermissions().add(permission);
                roleRepository.save(role);
            });
        });
    }

    @Override
    public void removePermissionFromRole(String roleName, String permissionName) {
        roleRepository.findByName(roleName).ifPresent(role -> {
            permissionRepository.findByName(permissionName).ifPresent(permission -> {
                role.getPermissions().remove(permission);
                roleRepository.save(role);
            });
        });
    }

    @Override
    public void syncRolePermissions(String roleName, Set<String> permissionNames) {
        roleRepository.findByName(roleName).ifPresent(role -> {
            Set<Permission> permissions = permissionNames.stream()
                    .map(name -> permissionRepository.findByName(name)
                            .orElseThrow(() -> new RuntimeException("Permission not found: " + name)))
                    .collect(java.util.stream.Collectors.toSet());
            role.setPermissions(permissions);
            roleRepository.save(role);
        });
    }

}
