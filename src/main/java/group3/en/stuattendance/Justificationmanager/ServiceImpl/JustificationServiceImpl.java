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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import group3.en.stuattendance.Auditmanager.Annotation.Auditable;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Transactional
public class JustificationServiceImpl implements JustificationService {

    private final JustificationRepository justificationRepository;
    private final UserRepository userRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final JustificationMapper justificationMapper;
    private final group3.en.stuattendance.Notificationmanager.Service.NotificationService notificationService;
    private final group3.en.stuattendance.Attendancemanager.Service.AttendanceService attendanceService;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
    private final group3.en.stuattendance.Usermanager.Service.EmailService emailService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public JustificationServiceImpl(
            JustificationRepository justificationRepository,
            UserRepository userRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            JustificationMapper justificationMapper,
            group3.en.stuattendance.Notificationmanager.Service.NotificationService notificationService,
            group3.en.stuattendance.Attendancemanager.Service.AttendanceService attendanceService,
            org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate,
            group3.en.stuattendance.Usermanager.Service.EmailService emailService) {
        this.justificationRepository = justificationRepository;
        this.userRepository = userRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.justificationMapper = justificationMapper;
        this.notificationService = notificationService;
        this.attendanceService = attendanceService;
        this.messagingTemplate = messagingTemplate;
        this.emailService = emailService;
    }

    @Override
    @Auditable(action = "JUSTIFICATION_CREATE", category = "JUSTIFICATION", severity = "INFO")
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
    @Auditable(action = "JUSTIFICATION_APPROVE", category = "JUSTIFICATION", severity = "INFO")
    public JustificationDto approveJustification(Integer id) {
        Justification justification = justificationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Justification not found with id: " + id));
        justification.setStatus(JustificationStatus.ACCEPTED);
        justification.setReasonForRejection(null);
        
        if (justification.getAttendanceRecord() != null) {
            AttendanceRecord record = justification.getAttendanceRecord();
            Integer sessionId = record.getSession().getSessionId();
            Integer userId = justification.getUser().getUserId();
            
            if (justification.getHourIndex() != null) {
                final int targetIdx = justification.getHourIndex();
                boolean isAbsent = record.getHourSlots().stream()
                        .filter(h -> h.getHourIndex() == targetIdx)
                        .findFirst()
                        .map(h -> h.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT)
                        .orElse(true);
                if (isAbsent) {
                    attendanceService.markHourStatus(sessionId, userId, targetIdx, 
                            group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.EXCUSED);
                }
            } else {
                int totalHours = 1;
                if (record.getSession().getStartTime() != null && record.getSession().getEndTime() != null) {
                    totalHours = (int) java.time.temporal.ChronoUnit.HOURS.between(
                            record.getSession().getStartTime(), record.getSession().getEndTime());
                }
                if (totalHours < 1) totalHours = 1;

                for (int i = 0; i < totalHours; i++) {
                    final int idx = i;
                    boolean isAbsent = record.getHourSlots().stream()
                            .filter(h -> h.getHourIndex() == idx)
                            .findFirst()
                            .map(h -> h.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT)
                            .orElse(true);
                    if (isAbsent) {
                        attendanceService.markHourStatus(sessionId, userId, idx, 
                                group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.EXCUSED);
                    }
                }
            }
        }
        
        Justification saved = justificationRepository.save(justification);
        
        String courseName = saved.getAttendanceRecord().getSession().getCourse().getCourseName();
        
        try {
            notificationService.sendNotification(saved.getUser().getUserId(), "JUSTIFICATION_APPROVED", 
                    "Your justification for " + courseName + " has been APPROVED.");
            
            if (saved.getUser().getEmail() != null) {
                emailService.sendJustificationDecisionEmail(saved.getUser().getEmail(), courseName, "APPROVED", "Your justification meets the required criteria.");
            }
        } catch (Exception e) {
            // Log error but do not fail the transaction, ensuring DB status is preserved
            org.slf4j.LoggerFactory.getLogger(JustificationServiceImpl.class)
                    .error("Failed to send approval notification or email for justification ID " + id, e);
        }
        
        return justificationMapper.toDto(saved);
    }

    @Override
    @Auditable(action = "JUSTIFICATION_REJECT", category = "JUSTIFICATION", severity = "WARNING")
    public JustificationDto rejectJustification(Integer id, String reasonForRejection) {
        Justification justification = justificationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Justification not found with id: " + id));
        justification.setStatus(JustificationStatus.REJECTED);
        justification.setReasonForRejection(reasonForRejection);
        Justification saved = justificationRepository.save(justification);
        
        String courseName = saved.getAttendanceRecord().getSession().getCourse().getCourseName();
        
        try {
            notificationService.sendNotification(saved.getUser().getUserId(), "JUSTIFICATION_REJECTED", 
                    "Your justification for " + courseName + " was REJECTED. Reason: " + reasonForRejection);
            
            if (saved.getUser().getEmail() != null) {
                emailService.sendJustificationDecisionEmail(saved.getUser().getEmail(), courseName, "REJECTED", reasonForRejection);
            }
        } catch (Exception e) {
            // Log error but do not fail the transaction, ensuring DB status is preserved
            org.slf4j.LoggerFactory.getLogger(JustificationServiceImpl.class)
                    .error("Failed to send rejection notification or email for justification ID " + id, e);
        }
        
        return justificationMapper.toDto(saved);
    }

    @Override
    @Auditable(action = "JUSTIFICATION_DELETE", category = "JUSTIFICATION", severity = "WARNING")
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
    @Auditable(action = "JUSTIFICATION_SUBMIT", category = "JUSTIFICATION", severity = "INFO")
    public group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto submitJustification(Integer userId, Integer attendanceId, MultipartFile file, String reason, Integer hourIndex) {
        AttendanceRecord record = attendanceRecordRepository.findById(attendanceId)
                .orElseThrow(() -> new EntityNotFoundException("Attendance record not found with id: " + attendanceId));

        if (!record.getUser().getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized: This attendance record does not belong to you.");
        }

        if (hourIndex != null) {
            boolean isAbsent = record.getHourSlots().stream()
                    .filter(h -> h.getHourIndex().equals(hourIndex))
                    .findFirst()
                    .map(h -> h.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT)
                    .orElse(true);
            if (!isAbsent) {
                throw new RuntimeException("Justification can only be submitted for ABSENT hour slots.");
            }
        } else {
            boolean hasAbsent = record.getHourSlots() == null || record.getHourSlots().isEmpty() ||
                    record.getHourSlots().stream().anyMatch(h -> h.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT);
            if (!hasAbsent) {
                throw new RuntimeException("Justification can only be submitted if there are ABSENT hour slots.");
            }
        }

        if (justificationRepository.existsByAttendanceRecordAttendanceIdAndHourIndex(attendanceId, hourIndex)) {
            throw new RuntimeException("A justification has already been submitted for this target.");
        }

        String path = null;
        if (file != null && !file.isEmpty()) {
            path = saveDocument(file);
        }

        User user = userRepository.getReferenceById(userId);

        Justification justification = new Justification();
        justification.setUser(user);
        justification.setAttendanceRecord(record);
        justification.setDocumentPath(path);
        justification.setReason(reason);
        justification.setHourIndex(hourIndex);
        justification.setStatus(JustificationStatus.PENDING);

        Justification saved = justificationRepository.save(justification);

        group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto responseDto = group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto.builder()
                .justificationId(saved.getJustificationId())
                .attendanceId(attendanceId)
                .courseName(record.getSession().getCourse() != null ? record.getSession().getCourse().getCourseName() : "N/A")
                .sessionDate(record.getSession().getDate())
                .reason(saved.getReason())
                .hourIndex(saved.getHourIndex())
                .status(saved.getStatus())
                .createdAt(saved.getCreatedAt())
                .build();

        messagingTemplate.convertAndSend("/topic/justifications", responseDto);

        return responseDto;
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
                        .hourIndex(j.getHourIndex())
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
            // Sanitise the original filename to avoid path traversal
            String originalName = Paths.get(document.getOriginalFilename()).getFileName().toString();
            String fileName = UUID.randomUUID().toString() + "_" + originalName;
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(document.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            // Return a web-accessible relative URL instead of an OS absolute path
            return "/uploads/" + fileName;
        } catch (IOException e) {
            throw new RuntimeException("Failed to save document: " + e.getMessage());
        }
    }
}