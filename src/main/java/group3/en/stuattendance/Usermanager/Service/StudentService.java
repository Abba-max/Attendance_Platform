package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Usermanager.DTO.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface StudentService {
    
    List<StudentScheduleDto> getTodaySchedule(Integer userId);

    List<StudentScheduleDto> getSessionsForGrid(Integer userId, Integer week);

    Page<StudentAttendanceHistoryDto> getAttendanceHistory(Integer userId, AttendanceStatus status, Integer classId, Pageable pageable);

    List<StudentAttendanceStatsDto> getCourseAttendanceStats(Integer userId);

    StudentDashboardStatsDto getDashboardStats(Integer userId);

    group3.en.stuattendance.Institutionmanager.DTO.InstitutionDto getInstitutionGeofence(Integer userId);
}
