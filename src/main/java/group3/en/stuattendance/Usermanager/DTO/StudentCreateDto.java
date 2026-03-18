package group3.en.stuattendance.Usermanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentCreateDto {
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String password;
    private String matricule;
    private Integer institutionId;
    private Integer classroomId; // Students belong to one class
    private Boolean isActive;
}
