package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.RoleDto;
import java.util.List;
import java.util.Set;

public interface RoleService {

    List<RoleDto> getAllRoles();

    RoleDto getRoleById(Integer roleId);

    RoleDto getRoleByName(String name);

    RoleDto createRole(RoleDto dto);

    RoleDto updateRole(Integer id, RoleDto dto);

    void deleteRole(Integer id);

    void syncRolePermissions(String roleName, Set<String> permissionNames);

    RoleDto getRoleWithPermissions(Integer roleId);
}