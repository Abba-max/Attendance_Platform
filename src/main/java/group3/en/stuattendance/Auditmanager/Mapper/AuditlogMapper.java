package group3.en.stuattendance.Auditmanager.Mapper;

import group3.en.stuattendance.Auditmanager.DTO.AuditlogDto;
import group3.en.stuattendance.Auditmanager.Model.Auditlog;
import org.springframework.stereotype.Component;

@Component
public class AuditlogMapper {

    public AuditlogDto toDto(Auditlog auditlog) {
        if (auditlog == null) return null;
        return AuditlogDto.builder()
                .auditId(auditlog.getAuditId())
                .action(auditlog.getAction())
                .userInfo(auditlog.getUserInfo())
                .details(auditlog.getDetails())
                .ipAddress(auditlog.getIpAddress())
                .timestamp(auditlog.getTimestamp())
                .build();
    }

    public Auditlog toEntity(AuditlogDto dto) {
        if (dto == null) return null;
        return Auditlog.builder()
                .auditId(dto.getAuditId())
                .action(dto.getAction())
                .userInfo(dto.getUserInfo())
                .details(dto.getDetails())
                .ipAddress(dto.getIpAddress())
                .build();
    }
}
