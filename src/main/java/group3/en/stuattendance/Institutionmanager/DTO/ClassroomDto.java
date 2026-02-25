package group3.en.stuattendance.Institutionmanager.DTO;

import jakarta.validation.constraints.Min;
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
public class ClassroomDto {

    private Integer classId;

    @NotBlank(message = "Field is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @NotBlank(message = "Level is required")
    @Size(max = 50, message = "Level must not exceed 50 characters")
    private String level;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;

    @NotNull(message = "Speciality ID is required")
    private Integer specialityId;

    private String field; // Added for UI compatibility
    private Integer institutionId; // Added for UI compatibility

    // Read-only display fields populated by mapper
    private String specialityName;
    private Integer departmentId;
    private Integer studentCount;
}
