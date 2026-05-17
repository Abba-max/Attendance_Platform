package group3.en.stuattendance.Justificationmanager.Mapper;

import group3.en.stuattendance.Justificationmanager.DTO.JustificationDto;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import org.springframework.stereotype.Component;

@Component
public class JustificationMapper {

    public JustificationDto toDto(Justification justification) {
        if (justification == null) return null;
        return JustificationDto.builder()
                .justificationId(justification.getJustificationId())
                .studentId(justification.getUser() != null ? justification.getUser().getUserId() : null)
                .studentName(justification.getUser() != null ?
                        justification.getUser().getFirstName() + " " + justification.getUser().getLastName() : null)
                .studentMatricule(justification.getUser() != null ? justification.getUser().getMatricule() : null)
                .className(justification.getUser() != null && justification.getUser().getClassroom() != null ? 
                        justification.getUser().getClassroom().getName() : null)
                .specialityName(justification.getUser() != null && justification.getUser().getClassroom() != null && 
                        justification.getUser().getClassroom().getSpeciality() != null ? 
                        justification.getUser().getClassroom().getSpeciality().getName() : null)
                .attendanceId(justification.getAttendanceRecord() != null ? justification.getAttendanceRecord().getAttendanceId() : null)
                .attendanceDate(justification.getAttendanceRecord() != null ? justification.getAttendanceRecord().getTimestamp() : null)
                .courseName(justification.getAttendanceRecord() != null &&
                        justification.getAttendanceRecord().getSession() != null &&
                        justification.getAttendanceRecord().getSession().getCourse() != null ?
                        justification.getAttendanceRecord().getSession().getCourse().getCourseName() : null)
                .documentPath(justification.getDocumentPath())
                .reason(justification.getReason())
                .hourIndex(justification.getHourIndex())
                .status(justification.getStatus())
                .reasonForRejection(justification.getReasonForRejection())
                .createdAt(justification.getCreatedAt())
                .updatedAt(justification.getUpdatedAt())
                .build();
    }

    public Justification toEntity(JustificationDto dto) {
        if (dto == null) return null;
        return Justification.builder()
                .justificationId(dto.getJustificationId())
                .documentPath(dto.getDocumentPath())
                .reason(dto.getReason())
                .hourIndex(dto.getHourIndex())
                .status(dto.getStatus())
                .reasonForRejection(dto.getReasonForRejection())
                .build();
    }
}