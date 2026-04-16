package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.DTO.ClassroomDto;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import java.util.List;

public interface ClassroomService {
    Classroom save(Classroom classroom);
    Classroom findById(Integer id);
    List<ClassroomDto> getAllClassrooms();

    List<ClassroomDto> findBySpecialityId(Integer specialityId);
    void deleteById(Integer id);
    ClassroomDto getClassroomDtoById(Integer id);
}