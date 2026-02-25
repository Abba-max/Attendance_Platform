package group3.en.stuattendance.Usermanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherCreateDto {
    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private Integer institutionId;
    private Set<Integer> classroomIds; // For assigning to classes
    private Boolean isActive;
}
