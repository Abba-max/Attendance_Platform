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
public class AcademicYearScheduleDto {
    private Long id;
    private Long academicYearId;
    private String academicYearName;

   
    private Integer cycleId;
    private String cycleName;
    private Integer departmentId;
    private String departmentName;
    private Integer classroomId;
    private String classroomName;

    private LocalDate startDate;
    private LocalDate endDate;
    private String status; // ACTIVE, SUSPENDED, CLOSED

    
    private String scopeLabel; // "Default", "Bachelor (Cycle)", "Computer Science (Dept)"
}
