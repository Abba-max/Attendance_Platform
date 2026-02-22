package group3.en.stuattendance.Auditmanager.DTO;

import group3.en.stuattendance.Auditmanager.Model.Auditlog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditlogDto {

    private Integer auditId;
    private String username;
    private String action;
    private String target;
    private String category;
    private String ipAddress;
    private String severity;
    private String userRole;
    private String timestamp;

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static AuditlogDto fromEntity(Auditlog auditlog) {
        if (auditlog == null) return null;

        return AuditlogDto.builder()
                .auditId(auditlog.getAuditId())
                .username(auditlog.getUsername())
                .action(auditlog.getAction())
                .target(auditlog.getTarget())
                .category(auditlog.getCategory())
                .ipAddress(auditlog.getIpAddress())
                .timestamp(auditlog.getTimestamp() != null
                        ? auditlog.getTimestamp().format(FORMATTER)
                        : "")
                .build();
    }
}