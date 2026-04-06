package group3.en.stuattendance.Attendancemanager.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRequestDTO {
    private Integer sessionId;
    private String pinCode;
    private String qrData;
    private String latitude;
    private String longitude;
}
