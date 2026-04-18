package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.PedagogAttendanceStatsDto;
import group3.en.stuattendance.Usermanager.DTO.PedagogStudentAttendanceStatsDto;
import java.util.List;

public interface PedagogStatsService {
    List<PedagogAttendanceStatsDto> getAttendanceStats(Integer departmentId, Integer specialityId, Integer classroomId, Integer courseId, Integer week);
    List<PedagogStudentAttendanceStatsDto> getStudentAttendanceStats(Integer classroomId, Integer courseId, Integer week);
    List<Integer> getCompletedWeeks();
}
