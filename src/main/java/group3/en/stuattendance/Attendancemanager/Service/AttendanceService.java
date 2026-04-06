package group3.en.stuattendance.Attendancemanager.Service;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto;
import java.util.List;

public interface AttendanceService {
    AttendanceRecordDto markAttendance(AttendanceRecordDto dto);
    List<AttendanceRecordDto> getAttendanceBySession(Integer sessionId);
    List<AttendanceRecordDto> getAttendanceByUser(Integer userId);
    
    // Teacher features
    AttendanceRecordDto markTeacherPresence(Integer sessionId, Integer teacherId);
    void bulkMarkAbsent(Integer sessionId, List<Integer> studentIds, String comment);
    String generateSessionToken(Integer sessionId, String type); // type: QR or PIN

    AttendanceRecordDto studentCheckIn(Integer sessionId, Integer userId, String qrCode, String pin, String location);
    
    AttendanceRecordDto teacherVerify(Integer sessionId, Integer userId, Integer hourIndex);

    List<AttendanceRecordDto> getEnrollmentStatus(Integer sessionId);
}
