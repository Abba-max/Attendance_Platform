package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.dto.AdminDto;
import group3.en.stuattendance.model.Admin;
import group3.en.stuattendance.model.User;

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
    void updateAdmin(Integer adminId, AdminDto dto);
    List<User> getAllUsers();
    Map<String, Object> getSystemStatistics();
    void deleteUser(Integer userId);

}
