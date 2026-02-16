package group3.en.stuattendance.Usermanager.Service.Impl;

import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Repository.RoleRepository;
import group3.en.stuattendance.Usermanager.Service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;

    @Override
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    @Override
    public Optional<Role> getRoleById(Integer roleId) {
        return roleRepository.findById(roleId);
    }

    @Override
    public Optional<Role> getRoleByName(String name) {
        return roleRepository.findByName(name);
    }

    @Override
    public Role createRole(group3.en.stuattendance.Usermanager.DTO.RoleDto dto) {
        Role role = Role.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .build();
        return roleRepository.save(role);
    }

    @Override
    public Role updateRole(Integer id, group3.en.stuattendance.Usermanager.DTO.RoleDto dto) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
        return roleRepository.save(role);
    }

    @Override
    public void deleteRole(Integer id) {
        roleRepository.deleteById(id);
    }
}
