package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.StudentDto;
import group3.en.stuattendance.Attendancemanager.DTO.AttendanceStatisticsDto;
import group3.en.stuattendance.Usermanager.Model.Student;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;

import java.time.LocalDate;
import java.util.List;

public interface StudentService {
    Student registerStudent(StudentDto dto);
    Student getStudentById(Integer studentId);
    Student getStudentByMatricule(String matricule);
    List<Student> getStudentsByClassroom(Integer classroomId);
    void assignToClassroom(Integer studentId, Integer classroomId);
//    List<AttendanceRecord> getAttendanceHistory(Integer studentId,
//                                                LocalDate startDate,
//                                                LocalDate endDate);
//    AttendanceStatisticsDto getAttendanceStatistics(Integer studentId);
}