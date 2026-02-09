package group3.en.stuattendance.Auditmanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditlogDto {

    private Integer auditId;
    private String action;
    private String userInfo;
    private String details;
    private String ipAddress;
    private LocalDateTime timestamp;
}
