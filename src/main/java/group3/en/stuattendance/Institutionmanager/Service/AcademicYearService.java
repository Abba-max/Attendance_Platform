package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearDto;
import java.util.List;

public interface AcademicYearService {
    AcademicYearDto createAcademicYear(AcademicYearDto dto);
    AcademicYearDto getActiveAcademicYear();
    List<AcademicYearDto> getAllAcademicYears();
    AcademicYearDto activateAcademicYear(Long id);
    AcademicYearDto suspendAcademicYear(Long id);
    AcademicYearDto closeAcademicYear(Long id);
    void deleteAcademicYear(Long id);
}
