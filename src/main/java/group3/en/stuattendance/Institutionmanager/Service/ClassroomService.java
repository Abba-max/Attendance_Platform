package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import java.util.List;

public interface ClassroomService {
    Classroom save(Classroom classroom);
    Classroom findById(Integer id);
    List<Classroom> getAllClassrooms();

    List<Classroom> findByDepartmentId(Integer deptId);
    void deleteById(Integer id);
}