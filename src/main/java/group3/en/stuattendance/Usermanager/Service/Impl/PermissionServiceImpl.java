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
}
