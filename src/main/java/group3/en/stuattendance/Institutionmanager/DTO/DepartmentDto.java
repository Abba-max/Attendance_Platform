package group3.en.stuattendance.Institutionmanager.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentDto {

    private Integer departmentId;

    @NotBlank(message = "Department name is required")
    @Size(max = 200, message = "Name must not exceed 200 characters")
    private String name;

    private String chief;


    private Integer cycleId;

    @Builder.Default
    private java.util.Set<Integer> pedagogicAssistantIds = new java.util.HashSet<>();

    @Builder.Default
    private java.util.Set<Integer> supervisorIds = new java.util.HashSet<>();

    private String cycleName;
    private String institutionName;

    private Integer pedagogicAssistantCount;
    private Integer supervisorCount;

    @Builder.Default
    private java.util.Set<SpecialityDto> specialities = new java.util.HashSet<>();
}
