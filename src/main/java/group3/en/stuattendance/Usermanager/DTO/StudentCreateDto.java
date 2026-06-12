package group3.en.stuattendance.Usermanager.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentCreateDto {
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotBlank(message = "Matricule is required")
    private String matricule;

    private Integer institutionId;

    @NotNull(message = "Classroom assignment is required")
    private Integer classroomId; // Students belong to one class

    private Boolean isActive;
}
