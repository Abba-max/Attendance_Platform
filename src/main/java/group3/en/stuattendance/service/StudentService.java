package group3.en.stuattendance.service;

import group3.en.stuattendance.dto.StudentDto;
import group3.en.stuattendance.dto.AttendanceStatisticsDto;
import group3.en.stuattendance.model.Student;
import group3.en.stuattendance.model.AttendanceRecord;

import java.time.LocalDate;
import java.util.List;

public interface StudentService {
    Student registerStudent(StudentDto dto);
    Student getStudentById(Integer studentId);
    Student getStudentByMatricule(String matricule);
    List<Student> getStudentsByClassroom(Integer classroomId);
    void assignToClassroom(Integer studentId, Integer classroomId);
    List<AttendanceRecord> getAttendanceHistory(Integer studentId,
                                                LocalDate startDate,
                                                LocalDate endDate);
    AttendanceStatisticsDto getAttendanceStatistics(Integer studentId);
}