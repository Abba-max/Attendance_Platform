package group3.en.stuattendance.Institutionmanager.Mapper;

import group3.en.stuattendance.Institutionmanager.DTO.CycleDto;
import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import org.springframework.stereotype.Component;

@Component
public class CycleMapper {

    public CycleDto toDto(Cycle cycle) {
        if (cycle == null) return null;
        return CycleDto.builder()
                .cycleId(cycle.getCycleId())
                .name(cycle.getName())
                .description(cycle.getDescription())
                .build();
    }

    public Cycle toEntity(CycleDto dto) {
        if (dto == null) return null;
        return Cycle.builder()
                .cycleId(dto.getCycleId())
                .name(dto.getName())
                .description(dto.getDescription())
                .build();
    }
}
