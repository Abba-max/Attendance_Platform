package group3.en.stuattendance.Justificationmanager.ServiceImpl;

import group3.en.stuattendance.Justificationmanager.DTO.JustificationDto;
import group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus;
import group3.en.stuattendance.Justificationmanager.Mapper.JustificationMapper;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import group3.en.stuattendance.Justificationmanager.Repository.JustificationRepository;
import group3.en.stuattendance.Justificationmanager.Service.JustificationService;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class JustificationServiceImpl implements JustificationService {

    private final JustificationRepository justificationRepository;
    private final UserRepository userRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final JustificationMapper justificationMapper;
    private final group3.en.stuattendance.Notificationmanager.Service.NotificationService notificationService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Override
    public JustificationDto createJustification(JustificationDto justificationDto, MultipartFile document) {
        Justification justification = justificationMapper.toEntity(justificationDto);

        if (justificationDto.getStudentId() != null) {
            User user = userRepository.findById(justificationDto.getStudentId())
                    .orElseThrow(() -> new EntityNotFoundException("Student not found with id: " + justificationDto.getStudentId()));
            justification.setUser(user);
        }

        if (justificationDto.getAttendanceId() != null) {
            AttendanceRecord attendanceRecord = attendanceRecordRepository.findById(justificationDto.getAttendanceId())
                    .orElseThrow(() -> new EntityNotFoundException("Attendance record not found with id: " + justificationDto.getAttendanceId()));
            justification.setAttendanceRecord(attendanceRecord);
        }

        if (document != null && !document.isEmpty()) {
            String documentPath = saveDocument(document);
            justification.setDocumentPath(documentPath);
        }

        justification.setStatus(JustificationStatus.PENDING);
        Justification saved = justificationRepository.save(justification);
        return justificationMapper.toDto(saved);
    }

    @Override
    public JustificationDto getJustificationById(Integer id) {
        Justification justification = justificationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Justification not found with id: " + id));
        return justificationMapper.toDto(justification);
    }

    @Override
    public Page<JustificationDto> getAllJustifications(int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return justificationRepository.findAll(pageable).map(justificationMapper::toDto);
    }

    @Override
    public Page<JustificationDto> getJustificationsByStatus(JustificationStatus status, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return justificationRepository.findByStatus(status, pageable).map(justificationMapper::toDto);
    }

    @Override
    public Page<JustificationDto> getJustificationsByStudent(Integer studentId, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return justificationRepository.findByUserUserId(studentId, pageable).map(justificationMapper::toDto);
    }

    @Override
    public Page<JustificationDto> getJustificationsByStudentAndStatus(Integer studentId, JustificationStatus status, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return justificationRepository.findByUserUserIdAndStatus(studentId, status, pageable).map(justificationMapper::toDto);
    }

    @Override
    public JustificationDto approveJustification(Integer id) {
        Justification justification = justificationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Justification not found with id: " + id));
        justification.setStatus(JustificationStatus.ACCEPTED);
        justification.setReasonForRejection(null);
        
        // Propagate to AttendanceRecord
        if (justification.getAttendanceRecord() != null) {
            justification.getAttendanceRecord().setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.EXCUSED);
        }
        
        Justification saved = justificationRepository.save(justification);
        
        // Notify Student
        notificationService.sendNotification(saved.getUser().getUserId(), "JUSTIFICATION_APPROVED", 
                "Your justification for " + saved.getAttendanceRecord().getSession().getCourse().getCourseName() + " has been APPROVED.");
        
        return justificationMapper.toDto(saved);
    }

    @Override
    public JustificationDto rejectJustification(Integer id, String reasonForRejection) {
        Justification justification = justificationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Justification not found with id: " + id));
        justification.setStatus(JustificationStatus.REJECTED);
        justification.setReasonForRejection(reasonForRejection);
        Justification saved = justificationRepository.save(justification);
        
        // Notify Student
        notificationService.sendNotification(saved.getUser().getUserId(), "JUSTIFICATION_REJECTED", 
                "Your justification for " + saved.getAttendanceRecord().getSession().getCourse().getCourseName() + " was REJECTED. Reason: " + reasonForRejection);
        
        return justificationMapper.toDto(saved);
    }

    @Override
    public void deleteJustification(Integer id) {
        if (!justificationRepository.existsById(id)) {
            throw new EntityNotFoundException("Justification not found with id: " + id);
        }
        justificationRepository.deleteById(id);
    }

    @Override
    public long countByStatus(JustificationStatus status) {
        return justificationRepository.countByStatus(status);
    }

    @Override
    public long countByStudent(Integer studentId) {
        return justificationRepository.countByUserUserId(studentId);
    }

    @Override
    public group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto submitJustification(Integer userId, Integer attendanceId, MultipartFile file, String reason) {
        AttendanceRecord record = attendanceRecordRepository.findById(attendanceId)
                .orElseThrow(() -> new EntityNotFoundException("Attendance record not found with id: " + attendanceId));

        // Validation 1: Belongs to student
        if (!record.getUser().getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized: This attendance record does not belong to you.");
        }

        // Validation 2: Status is ABSENT
        if (record.getStatus() != group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT) {
            throw new RuntimeException("Justification can only be submitted for ABSENT records.");
        }

        // Validation 3: Duplicate prevention
        if (justificationRepository.existsByAttendanceRecordAttendanceId(attendanceId)) {
            throw new RuntimeException("A justification has already been submitted for this absence.");
        }

        String path = null;
        if (file != null && !file.isEmpty()) {
            path = saveDocument(file);
        }

        User user = userRepository.getReferenceById(userId);

        Justification justification = Justification.builder()
                .user(user)
                .attendanceRecord(record)
                .documentPath(path)
                .reason(reason)
                .status(JustificationStatus.PENDING)
                .build();

        Justification saved = justificationRepository.save(justification);

        return group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto.builder()
                .justificationId(saved.getJustificationId())
                .attendanceId(attendanceId)
                .courseName(record.getSession().getCourse() != null ? record.getSession().getCourse().getCourseName() : "N/A")
                .sessionDate(record.getSession().getDate())
                .reason(saved.getReason())
                .status(saved.getStatus())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    public java.util.List<group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto> getJustificationsForStudent(Integer userId) {
        return justificationRepository.findByUserUserId(userId, Pageable.unpaged())
                .stream()
                .map(j -> group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto.builder()
                        .justificationId(j.getJustificationId())
                        .attendanceId(j.getAttendanceRecord().getAttendanceId())
                        .courseName(j.getAttendanceRecord().getSession().getCourse() != null ? j.getAttendanceRecord().getSession().getCourse().getCourseName() : "N/A")
                        .sessionDate(j.getAttendanceRecord().getSession().getDate())
                        .reason(j.getReason())
                        .status(j.getStatus())
                        .reasonForRejection(j.getReasonForRejection())
                        .createdAt(j.getCreatedAt())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    private String saveDocument(MultipartFile document) {
        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            String fileName = UUID.randomUUID().toString() + "_" + document.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(document.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            return filePath.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to save document: " + e.getMessage());
        }
    }
}