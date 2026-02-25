package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearScheduleDto;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYearSchedule;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYearStatus;
import org.springframework.stereotype.Component;

@Component
public class AcademicYearScheduleMapper {

    public AcademicYearScheduleDto toDto(AcademicYearSchedule entity) {
        if (entity == null) return null;

        String scopeLabel = "Default (Institution-wide)";
        if (entity.getSpeciality() != null) {
            scopeLabel = entity.getSpeciality().getName() + " (Spec)";
        } else if (entity.getDepartment() != null) {
            scopeLabel = entity.getDepartment().getName() + " (Dept)";
        } else if (entity.getCycle() != null) {
            scopeLabel = entity.getCycle().getName() + " (Cycle)";
        }

        return AcademicYearScheduleDto.builder()
                .id(entity.getId())
                .academicYearId(entity.getAcademicYear().getId())
                .academicYearName(entity.getAcademicYear().getAcademicYear())
                .cycleId(entity.getCycle() != null ? entity.getCycle().getCycleId() : null)
                .cycleName(entity.getCycle() != null ? entity.getCycle().getName() : null)
                .departmentId(entity.getDepartment() != null ? entity.getDepartment().getDepartmentId() : null)
                .departmentName(entity.getDepartment() != null ? entity.getDepartment().getName() : null)
                .specialityId(entity.getSpeciality() != null ? entity.getSpeciality().getSpecialityId() : null)
                .specialityName(entity.getSpeciality() != null ? entity.getSpeciality().getName() : null)
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .status(entity.getStatus().name())
                .scopeLabel(scopeLabel)
                .build();
    }
}
