package group3.en.stuattendance.Usermanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDto {
    private String username;
    private String email;
    private String password;
    private String matricule;
    private String externalEmail;
    private Integer classroomId;
}
