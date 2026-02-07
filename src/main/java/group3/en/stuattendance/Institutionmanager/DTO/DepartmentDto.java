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

    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    @Size(max = 200, message = "Contact info must not exceed 200 characters")
    private String contactInfo;
}
