package group3.en.stuattendance.service.impl;

import group3.en.stuattendance.dto.StudentDto;
import group3.en.stuattendance.dto.AttendanceStatisticsDto;
import group3.en.stuattendance.model.Student;
import group3.en.stuattendance.model.Classroom;
import group3.en.stuattendance.model.AttendanceRecord;
import group3.en.stuattendance.model.enums.AttendanceStatus;
import group3.en.stuattendance.repository.StudentRepository;
import group3.en.stuattendance.repository.ClassroomRepository;
import group3.en.stuattendance.repository.AttendanceRecordRepository;
import group3.en.stuattendance.service.StudentService;
import group3.en.stuattendance.exception.ResourceNotFoundException;
import group3.en.stuattendance.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class StudentServiceImpl implements StudentService {

    private final StudentRepository studentRepository;
    private final ClassroomRepository classroomRepository;
    private final AttendanceRecordRepository attendanceRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Student registerStudent(StudentDto dto) {
        Student student = new Student();
        student.setUsername(dto.getUsername());
        student.setEmail(dto.getEmail());
        student.setPassword(passwordEncoder.encode(dto.getPassword()));
        student.setMatricule(dto.getMatricule());
        student.setExternalEmail(dto.getExternalEmail());
        return studentRepository.save(student);
    }

    @Override
    @Transactional(readOnly = true)
    public Student getStudentById(Integer studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));
    }

    @Override
    @Transactional(readOnly = true)
    public Student getStudentByMatricule(String matricule) {
        return studentRepository.findByMatricule(matricule)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with matricule: " + matricule));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Student> getStudentsByClassroom(Integer classroomId) {
        return studentRepository.findAllByClassroomId(classroomId);
    }

    @Override
    public void assignToClassroom(Integer studentId, Integer classroomId) {
        Student student = getStudentById(studentId);
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found"));

        if (classroom.isAtCapacity()) {
            throw new BusinessException("Classroom is at full capacity");
        }

        student.setClassroom(classroom);
        studentRepository.save(student);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceRecord> getAttendanceHistory(Integer studentId, LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByStudentIdAndDateRange(studentId, startDate, endDate);
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceStatisticsDto getAttendanceStatistics(Integer studentId) {
        Long present = attendanceRepository.countByStudentIdAndStatus(studentId, AttendanceStatus.PRESENT);
        Long absent = attendanceRepository.countByStudentIdAndStatus(studentId, AttendanceStatus.ABSENT);
        Long late = attendanceRepository.countByStudentIdAndStatus(studentId, AttendanceStatus.LATE);

        Long total = present + absent + late;
        Double percentage = total > 0 ? (present.doubleValue() / total) * 100 : 0.0;

        return AttendanceStatisticsDto.builder()
                .presentCount(present)
                .absentCount(absent)
                .lateCount(late)
                .totalSessions(total)
                .attendancePercentage(percentage)
                .build();
    }
}