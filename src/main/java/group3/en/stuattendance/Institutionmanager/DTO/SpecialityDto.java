package group3.en.stuattendance.Institutionmanager.DTO;

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
public class SpecialityDto {

    private Integer specialityId;

    @NotBlank(message = "Speciality name is required")
    @Size(max = 200, message = "Name must not exceed 200 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @NotNull(message = "Department ID is required")
    private Integer departmentId;

    @Builder.Default
    private java.util.Set<ClassroomDto> classrooms = new java.util.HashSet<>();
}
