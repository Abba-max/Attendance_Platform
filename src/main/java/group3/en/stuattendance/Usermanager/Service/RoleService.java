package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.Model.Role;
import java.util.List;
import java.util.Optional;

public interface RoleService {
    List<Role> getAllRoles();
    Optional<Role> getRoleById(Integer roleId);
    Optional<Role> getRoleByName(String name);
}
