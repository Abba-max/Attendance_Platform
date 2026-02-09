package group3.en.stuattendance.Justificationmanager.Mapper;

import group3.en.stuattendance.Justificationmanager.DTO.JustificationDto;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import group3.en.stuattendance.Usermanager.Model.Student;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import org.springframework.stereotype.Component;

@Component
public class JustificationMapper {

    public JustificationDto toDto(Justification justification) {
        if (justification == null) return null;
        return JustificationDto.builder()
                .justificationId(justification.getJustificationId())
                .studentId(justification.getStudent() != null ? justification.getStudent().getUserId() : null)
                .attendanceId(justification.getAttendanceRecord() != null ? justification.getAttendanceRecord().getAttendanceId() : null)
                .documentPath(justification.getDocumentPath())
                .reason(justification.getReason())
                .status(justification.getStatus())
                .reasonForRejection(justification.getReasonForRejection())
                .createdAt(justification.getCreatedAt())
                .updatedAt(justification.getUpdatedAt())
                .build();
    }

    public Justification toEntity(JustificationDto dto, Student student, AttendanceRecord attendanceRecord) {
        if (dto == null) return null;
        return Justification.builder()
                .justificationId(dto.getJustificationId())
                .student(student)
                .attendanceRecord(attendanceRecord)
                .documentPath(dto.getDocumentPath())
                .reason(dto.getReason())
                .status(dto.getStatus())
                .reasonForRejection(dto.getReasonForRejection())
                .build();
    }
}
