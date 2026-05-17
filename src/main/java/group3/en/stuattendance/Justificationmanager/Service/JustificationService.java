package group3.en.stuattendance.Justificationmanager.Service;

import group3.en.stuattendance.Justificationmanager.DTO.JustificationDto;
import group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

public interface JustificationService {

    JustificationDto createJustification(JustificationDto justificationDto, MultipartFile document);

    JustificationDto getJustificationById(Integer id);

    Page<JustificationDto> getAllJustifications(int page, int size, String sortBy, String sortDir);

    Page<JustificationDto> getJustificationsByStatus(JustificationStatus status, int page, int size, String sortBy, String sortDir);

    Page<JustificationDto> getJustificationsByStudent(Integer studentId, int page, int size, String sortBy, String sortDir);

    Page<JustificationDto> getJustificationsByStudentAndStatus(Integer studentId, JustificationStatus status, int page, int size, String sortBy, String sortDir);

    JustificationDto approveJustification(Integer id);

    JustificationDto rejectJustification(Integer id, String reasonForRejection);

    void deleteJustification(Integer id);

    long countByStatus(JustificationStatus status);

    long countByStudent(Integer studentId);

    group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto submitJustification(Integer userId, Integer attendanceId, org.springframework.web.multipart.MultipartFile file, String reason, Integer hourIndex);

    java.util.List<group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto> getJustificationsForStudent(Integer userId);
}