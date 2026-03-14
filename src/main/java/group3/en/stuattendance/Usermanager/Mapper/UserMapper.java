package group3.en.stuattendance.Usermanager.Mapper;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.Permission;
import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class UserMapper {

    public UserDto toDto(User user) {
        if (user == null) return null;
        return UserDto.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .isActive(Boolean.TRUE.equals(user.getIsActive()))
                .institutionId(user.getInstitution() != null ? user.getInstitution().getInstitutionId() : null)
                .roleIds(user.getRoles().stream().map(Role::getRoleId).collect(Collectors.toSet()))
                .roleNames(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                
                // Permission Overrides
                .additionalPermissionIds(user.getAdditionalPermissions().stream().map(p -> p.getPermissionId()).collect(Collectors.toSet()))
                .additionalPermissionNames(user.getAdditionalPermissions().stream().map(p -> p.getName()).collect(Collectors.toSet()))
                .deniedPermissionIds(user.getDeniedPermissions().stream().map(p -> p.getPermissionId()).collect(Collectors.toSet()))
                .deniedPermissionNames(user.getDeniedPermissions().stream().map(p -> p.getName()).collect(Collectors.toSet()))
                
                .effectivePermissionIds(calculateEffectivePermissionIds(user))
                .effectivePermissionNames(calculateEffectivePermissionNames(user))
                
                .availablePermissionIds(calculateAvailablePermissionIds(user))
                .availablePermissionNames(calculateAvailablePermissionNames(user))
                
                .classroomId(user.getClassroom() != null ? user.getClassroom().getClassId() : null)
                .matricule(user.getMatricule())
                .externalEmail(user.getExternalEmail())
                .staffClassroomIds(user.getStaffClassrooms().stream().map(Classroom::getClassId).collect(Collectors.toSet()))
                .joinCode(user.getJoinCode())
                .build();
    }

    public User toEntity(UserDto dto, Institution institution, Classroom studentClassroom, Set<Role> roles, 
                        Set<Classroom> staffClassrooms, Set<Permission> additionalPermissions, Set<Permission> deniedPermissions) {
        if (dto == null) return null;
        User user = User.builder()
                .userId(dto.getUserId())
                .username(dto.getUsername())
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .email(dto.getEmail())
                .password(dto.getPassword())
                .isActive(Boolean.TRUE.equals(dto.getIsActive()))
                .institution(institution)
                .roles(roles != null ? roles : new HashSet<>())
                .additionalPermissions(additionalPermissions != null ? additionalPermissions : new HashSet<>())
                .deniedPermissions(deniedPermissions != null ? deniedPermissions : new HashSet<>())
                .classroom(studentClassroom)
                .matricule(dto.getMatricule())
                .externalEmail(dto.getExternalEmail())
                .staffClassrooms(staffClassrooms != null ? staffClassrooms : new HashSet<>())
                .joinCode(dto.getJoinCode())
                .build();
        return user;
    }
    private Set<Integer> calculateEffectivePermissionIds(User user) {
        Set<Integer> permissions = new HashSet<>();
        // From Roles
        user.getRoles().forEach(role -> 
            role.getPermissions().forEach(p -> permissions.add(p.getPermissionId()))
        );
        // Add Overrides
        user.getAdditionalPermissions().forEach(p -> permissions.add(p.getPermissionId()));
        // Remove Denied
        user.getDeniedPermissions().forEach(p -> permissions.remove(p.getPermissionId()));
        return permissions;
    }

    private Set<String> calculateEffectivePermissionNames(User user) {
        Set<Permission> permissions = new HashSet<>();
        // From Roles
        user.getRoles().forEach(role -> 
            permissions.addAll(role.getPermissions())
        );
        // Add Overrides
        permissions.addAll(user.getAdditionalPermissions());
        
        // Collect names and remove denied
        Set<Integer> deniedIds = user.getDeniedPermissions().stream()
                .map(Permission::getPermissionId).collect(Collectors.toSet());
        
        return permissions.stream()
                .filter(p -> !deniedIds.contains(p.getPermissionId()))
                .map(Permission::getName)
                .collect(Collectors.toSet());
    }

    private Set<Integer> calculateAvailablePermissionIds(User user) {
        Set<Integer> permissions = new HashSet<>();
        user.getRoles().forEach(role -> 
            role.getPermissions().forEach(p -> permissions.add(p.getPermissionId()))
        );
        return permissions;
    }

    private Set<String> calculateAvailablePermissionNames(User user) {
        Set<String> permissions = new HashSet<>();
        user.getRoles().forEach(role -> 
            role.getPermissions().forEach(p -> permissions.add(p.getName()))
        );
        return permissions;
    }
}
