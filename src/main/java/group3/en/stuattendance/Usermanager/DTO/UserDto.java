package group3.en.stuattendance.Usermanager.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {

    private Integer userId;

    @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
    private String username;

    @Email(message = "Email should be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    private Boolean isActive;
    private Integer institutionId;
    private String userType;
}
