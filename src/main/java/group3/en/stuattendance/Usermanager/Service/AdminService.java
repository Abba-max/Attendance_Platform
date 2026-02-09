package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Institutionmanager.DTO.InstitutionDto;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Usermanager.DTO.AdminDto;
import group3.en.stuattendance.Usermanager.DTO.SupervisorDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherDto;
import group3.en.stuattendance.Usermanager.Model.Admin;
import group3.en.stuattendance.Usermanager.Model.Supervisor;
import group3.en.stuattendance.Usermanager.Model.Teacher;
import group3.en.stuattendance.Usermanager.Model.User;

import java.util.List;
import java.util.Map;

public interface AdminService {
    Admin registerAdmin(AdminDto dto);
    Admin getAdminById(Integer adminId);
    Admin getAdminByUserId(Integer userId);
    Teacher registerTeacher(TeacherDto dto);
    Supervisor registerSupervisor(SupervisorDto dto);
    Institution registerInstitution(InstitutionDto dto);
    List<Admin> getAllAdmins();
//    void updateAdmin(Integer adminId, AdminDto dto);
    List<User> getAllUsers();
    Map<String, Object> getSystemStatistics();
    void deleteUser(Integer userId);

}
