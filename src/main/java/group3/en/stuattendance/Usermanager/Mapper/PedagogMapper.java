package group3.en.stuattendance.Usermanager.Mapper;

import group3.en.stuattendance.Usermanager.DTO.PedagogDto;
import group3.en.stuattendance.Usermanager.Model.Pedagog;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import org.springframework.stereotype.Component;

@Component
public class PedagogMapper {

    public PedagogDto toDto(Pedagog pedagog) {
        if (pedagog == null) return null;
        return PedagogDto.builder()
                .pedagogId(pedagog.getPedagogId())
                .username(pedagog.getUsername())
                .email(pedagog.getEmail())
                .isActive(pedagog.getIsActive())
                .institutionId(pedagog.getInstitution() != null ? pedagog.getInstitution().getInstitutionId() : null)
                .build();
    }

    public Pedagog toEntity(PedagogDto dto, Institution institution) {
        if (dto == null) return null;
        Pedagog pedagog = new Pedagog();
        pedagog.setPedagogId(dto.getPedagogId());
        pedagog.setUsername(dto.getUsername());
        pedagog.setEmail(dto.getEmail());
        pedagog.setIsActive(dto.getIsActive());
        pedagog.setInstitution(institution);
        return pedagog;
    }
}
