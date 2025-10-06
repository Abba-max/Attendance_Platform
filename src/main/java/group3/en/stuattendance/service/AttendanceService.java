package group3.en.stuattendance.service;

import group3.en.stuattendance.dto.AttendanceCheckInDto;
import group3.en.stuattendance.model.AttendanceRecord;
import group3.en.stuattendance.model.enums.AttendanceStatus;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceService {
    AttendanceRecord recordAttendance(AttendanceCheckInDto dto);
    AttendanceRecord recordAttendanceByQR(String qrCode, Integer studentId, String location);
    AttendanceRecord markAttendanceManually(Integer sessionId, Integer studentId,
                                            AttendanceStatus status);
    void updateAttendanceStatus(Integer attendanceId, AttendanceStatus newStatus);
    List<AttendanceRecord> getSessionAttendance(Integer sessionId);
    Double calculateAttendancePercentage(Integer studentId, Integer courseId);
}
