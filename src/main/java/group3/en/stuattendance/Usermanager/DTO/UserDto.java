package group3.en.stuattendance.Usermanager.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {

    private Integer userId;

    @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
    private String username;
    private String firstName;
    private String lastName;

    @Email(message = "Email should be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private Boolean isActive;
    private Integer institutionId;
    
    // RBAC
    private Set<Integer> roleIds;
    private Set<String> roleNames;

    // Permission Overrides (Names for display, IDs for updates)
    private Set<Integer> additionalPermissionIds;
    private Set<String> additionalPermissionNames;
    private Set<Integer> deniedPermissionIds;
    private Set<String> deniedPermissionNames;
    private Set<Integer> effectivePermissionIds;
    private Set<String> effectivePermissionNames;

    // Available permissions (Union of all permissions from assigned roles)
    private Set<Integer> availablePermissionIds;
    private Set<String> availablePermissionNames;

    // Student specific
    private Integer classroomId;
    private String matricule;
    private String externalEmail;

    // Staff specific
    private Set<Integer> 
            staffClassroomIds;
    private String joinCode;
}
