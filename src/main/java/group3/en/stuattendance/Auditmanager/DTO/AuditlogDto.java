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
    private String timestamp;

    // static fields are ignored by Lombok @Builder — no conflict
    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static AuditlogDto fromEntity(Auditlog log) {
        if (log == null) return null;

        return AuditlogDto.builder()
                .auditId(log.getAuditId())
                .username(log.getUsername())
                .action(log.getAction())
                .target(log.getTarget())
                .category(log.getCategory())
                .ipAddress(log.getIpAddress())
                .timestamp(log.getTimestamp() != null
                        ? log.getTimestamp().format(FORMATTER)
                        : "")
                .build();
    }
}