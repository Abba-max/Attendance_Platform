package group3.en.stuattendance.Institutionmanager.Service.ServiceImpl;

import group3.en.stuattendance.Institutionmanager.DTO.SpecialityDto;
import group3.en.stuattendance.Institutionmanager.Mapper.SpecialityMapper;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Model.Speciality;
import group3.en.stuattendance.Institutionmanager.Repository.DepartmentRepository;
import group3.en.stuattendance.Institutionmanager.Repository.SpecialityRepository;
import group3.en.stuattendance.Institutionmanager.Service.SpecialityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class SpecialityServiceImpl implements SpecialityService {

    private final SpecialityRepository specialityRepository;
    private final DepartmentRepository departmentRepository;
    private final SpecialityMapper specialityMapper;

    @Override
    public SpecialityDto createSpeciality(SpecialityDto specialityDto) {
        Department department = departmentRepository.findById(specialityDto.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Department not found"));
        Speciality speciality = specialityMapper.toEntity(specialityDto, department);
        Speciality savedSpeciality = specialityRepository.save(speciality);
        return specialityMapper.toDto(savedSpeciality);
    }

    @Override
    public SpecialityDto updateSpeciality(Integer id, SpecialityDto specialityDto) {
        Speciality speciality = specialityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Speciality not found"));
        Department department = departmentRepository.findById(specialityDto.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Department not found"));
        
        speciality.setName(specialityDto.getName());
        speciality.setDescription(specialityDto.getDescription());
        speciality.setDepartment(department);
        
        Speciality updatedSpeciality = specialityRepository.save(speciality);
        return specialityMapper.toDto(updatedSpeciality);
    }

    @Override
    public SpecialityDto getSpecialityById(Integer id) {
        Speciality speciality = specialityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Speciality not found"));
        
        // Initialize lazy properties
        if (speciality.getDepartment() != null) speciality.getDepartment().getName();
        if (speciality.getClassrooms() != null) speciality.getClassrooms().size();
        
        return specialityMapper.toDto(speciality);
    }

    @Override
    public List<SpecialityDto> getAllSpecialities() {
        return specialityRepository.findAll().stream()
                .map(specialityMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SpecialityDto> getSpecialitiesByDepartmentId(Integer departmentId) {
        return specialityRepository.findByDepartment_DepartmentId(departmentId).stream()
                .map(specialityMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteSpeciality(Integer id) {
        specialityRepository.deleteById(id);
    }

    @Override
    public Speciality findByIdEntity(Integer id) {
        return specialityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Speciality not found with id: " + id));
    }
}
