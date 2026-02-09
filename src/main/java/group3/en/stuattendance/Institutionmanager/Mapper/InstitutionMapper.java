package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.InstitutionDto;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import org.springframework.stereotype.Component;

@Component
public class InstitutionMapper {

    public InstitutionDto toDto(Institution institution) {
        if (institution == null) return null;
        return InstitutionDto.builder()
                .institutionId(institution.getInstitutionId())
                .name(institution.getName())
                .address(institution.getLocation())
                .build();
    }

    public Institution toEntity(InstitutionDto dto) {
        if (dto == null) return null;
        return Institution.builder()
                .institutionId(dto.getInstitutionId())
                .name(dto.getName())
                .location(dto.getAddress())
                .build();
    }
}
