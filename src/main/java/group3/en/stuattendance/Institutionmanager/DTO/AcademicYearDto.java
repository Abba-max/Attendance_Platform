package group3.en.stuattendance.Institutionmanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcademicYearDto {
    private Long id;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status; // ACTIVE, SUSPENDED, CLOSED
    private boolean isActive;
    private String academicYear;
}
