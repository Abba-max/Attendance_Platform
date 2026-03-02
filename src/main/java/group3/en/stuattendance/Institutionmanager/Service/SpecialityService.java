package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.DTO.SpecialityDto;
import java.util.List;

public interface SpecialityService {
    SpecialityDto createSpeciality(SpecialityDto specialityDto);
    SpecialityDto updateSpeciality(Integer id, SpecialityDto specialityDto);
    SpecialityDto getSpecialityById(Integer id);
    List<SpecialityDto> getAllSpecialities();
    List<SpecialityDto> getSpecialitiesByDepartmentId(Integer departmentId);
    void deleteSpeciality(Integer id);
    group3.en.stuattendance.Institutionmanager.Model.Speciality findByIdEntity(Integer id);
}
