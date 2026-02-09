package group3.en.stuattendance.Usermanager.Mapper;

import group3.en.stuattendance.Usermanager.DTO.SupervisorDto;
import group3.en.stuattendance.Usermanager.Model.Supervisor;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import org.springframework.stereotype.Component;

@Component
public class SupervisorMapper {

    public SupervisorDto toDto(Supervisor supervisor) {
        if (supervisor == null) return null;
        return SupervisorDto.builder()
                .supervisorId(supervisor.getSupervisorId())
                .username(supervisor.getUsername())
                .email(supervisor.getEmail())
                .isActive(supervisor.getIsActive())
                .institutionId(supervisor.getInstitution() != null ? supervisor.getInstitution().getInstitutionId() : null)
                .build();
    }

    public Supervisor toEntity(SupervisorDto dto, Institution institution) {
        if (dto == null) return null;
        Supervisor supervisor = new Supervisor();
        supervisor.setSupervisorId(dto.getSupervisorId());
        supervisor.setUsername(dto.getUsername());
        supervisor.setEmail(dto.getEmail());
        supervisor.setIsActive(dto.getIsActive());
        supervisor.setInstitution(institution);
        return supervisor;
    }
}
