package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.User;
import java.util.List;
import java.util.Optional;

public interface UserService {
    // Basic User Management
    User registerUser(group3.en.stuattendance.Usermanager.DTO.UserDto dto);
    User registerStaff(group3.en.stuattendance.Usermanager.DTO.StaffCreateDto dto);
    User registerTeacher(group3.en.stuattendance.Usermanager.DTO.TeacherCreateDto dto);
    User registerStudent(group3.en.stuattendance.Usermanager.DTO.StudentCreateDto dto);
    Optional<User> getUserById(Integer userId);
    List<User> getAllStaff();
    List<UserDto> getAllStaffDtos();
    Optional<User> getUserByUsername(String username);
    Optional<User> getUserByEmail(String email);
    List<User> getAllUsers();
    List<UserDto> getAllUserDtos();
    User updateUser(Integer userId, UserDto dto);
    void deleteUser(Integer userId);
    void deactivateUser(Integer userId);
    void activateUser(Integer userId);
    List<UserDto> getUsersByRole(String roleName);

    // Role and Permissions
    void assignRole(Integer userId, Integer roleId);
    void removeRole(Integer userId, Integer roleId);
    void grantPermission(Integer userId, Integer permissionId);
    void revokePermission(Integer userId, Integer permissionId);
    void clearPermissionOverride(Integer userId, Integer permissionId);
    void clearPermissionOverrides(Integer userId);

    // Student Specific
    Optional<User> getUserByMatricule(String matricule);
    List<User> getStudentsByClassroom(Integer classroomId);
    void assignStudentToClassroom(Integer userId, Integer classroomId);

    // Teacher Specific
    Optional<User> getUserByJoinCode(String joinCode);
    void assignStaffToClassroom(Integer userId, Integer classroomId);
 
    List<UserDto> getTeachersByClassroom(Integer classroomId);
 
    List<UserDto> getTeachersBySpeciality(Integer specialityId);
    
    // Auth related
    void resetPassword(Integer userId, String newPassword);

    // Bulk Operations
    group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto bulkImportStaff(org.springframework.web.multipart.MultipartFile file);
    group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto bulkImportStudents(org.springframework.web.multipart.MultipartFile file, Integer classroomId);
}
