package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.Model.Permission;
import java.util.List;
import java.util.Set;

public interface PermissionService {
    List<Permission> getAllPermissions();
    Set<Permission> getPermissionsByRole(String roleName);
    void addPermissionToRole(String roleName, String permissionName);
    void removePermissionFromRole(String roleName, String permissionName);
    void syncRolePermissions(String roleName, Set<String> permissionNames);
}
