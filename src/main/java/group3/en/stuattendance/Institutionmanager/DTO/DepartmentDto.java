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

    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    @Size(max = 200, message = "Contact info must not exceed 200 characters")
    private String contactInfo;

    private Integer cycleId;

    private Integer pedagogicAssistantId;

    @Builder.Default
    private java.util.Set<Integer> supervisorIds = new java.util.HashSet<>();
}
