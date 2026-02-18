package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearDto;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYearStatus;
import org.springframework.stereotype.Component;

@Component
public class AcademicYearMapper {

    public AcademicYearDto toDto(AcademicYear entity) {
        if (entity == null) return null;
        return AcademicYearDto.builder()
                .id(entity.getId())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .isActive(entity.isActive())
                .status(entity.getStatus().name())
                .academicYear(entity.getAcademicYear())
                .build();
    }

    public AcademicYear toEntity(AcademicYearDto dto) {
        if (dto == null) return null;
        AcademicYearStatus status = AcademicYearStatus.ACTIVE;
        if (dto.getStatus() != null) {
            try {
                status = AcademicYearStatus.valueOf(dto.getStatus());
            } catch (IllegalArgumentException e) {
                // Default to ACTIVE or based on isActive flag
                status = dto.isActive() ? AcademicYearStatus.ACTIVE : AcademicYearStatus.CLOSED;
            }
        } else {
            status = dto.isActive() ? AcademicYearStatus.ACTIVE : AcademicYearStatus.CLOSED;
        }

        return AcademicYear.builder()
                .id(dto.getId())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .status(status)
                .academicYear(dto.getAcademicYear())
                .build();
    }
}
