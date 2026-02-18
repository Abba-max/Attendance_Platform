package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearDto;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
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
                .academicYear(entity.getAcademicYear())
                .build();
    }

    public AcademicYear toEntity(AcademicYearDto dto) {
        if (dto == null) return null;
        return AcademicYear.builder()
                .id(dto.getId())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .isActive(dto.isActive())
                .academicYear(dto.getAcademicYear())
                .build();
    }
}
