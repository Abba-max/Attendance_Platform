package group3.en.stuattendance.Institutionmanager.ServiceImpl;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearDto;
import group3.en.stuattendance.Institutionmanager.Mapper.AcademicYearMapper;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Institutionmanager.Service.AcademicYearService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AcademicYearServiceImpl implements AcademicYearService {

    private final AcademicYearRepository academicYearRepository;
    private final AcademicYearMapper academicYearMapper;

    @Override
    @Transactional
    public AcademicYearDto createAcademicYear(AcademicYearDto dto) {
        AcademicYear entity = academicYearMapper.toEntity(dto);
        
        // If this is the first one or set to active, deactivate others
        if (entity.isActive()) {
            deactivateAll();
        } else if (academicYearRepository.count() == 0) {
            entity.setActive(true);
        }

        AcademicYear saved = academicYearRepository.save(entity);
        return academicYearMapper.toDto(saved);
    }

    @Override
    public AcademicYearDto getActiveAcademicYear() {
        return academicYearRepository.findActiveAcademicYear()
                .map(academicYearMapper::toDto)
                .orElse(null);
    }

    @Override
    public List<AcademicYearDto> getAllAcademicYears() {
        return academicYearRepository.findAll().stream()
                .map(academicYearMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AcademicYearDto activateAcademicYear(Long id) {
        AcademicYear year = academicYearRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Academic Year not found"));
        
        deactivateAll();
        year.setActive(true);
        
        return academicYearMapper.toDto(academicYearRepository.save(year));
    }

    @Override
    @Transactional
    public void deleteAcademicYear(Long id) {
        AcademicYear year = academicYearRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Academic Year not found"));
        
        if (year.isActive()) {
            throw new RuntimeException("Cannot delete active academic year");
        }
        
        academicYearRepository.delete(year);
    }

    private void deactivateAll() {
        List<AcademicYear> all = academicYearRepository.findAll();
        all.forEach(a -> a.setActive(false));
        academicYearRepository.saveAll(all);
    }
}
