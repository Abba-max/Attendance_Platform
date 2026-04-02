package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserService {
    // Basic User Management
    UserDto registerUser(group3.en.stuattendance.Usermanager.DTO.UserDto dto);
    UserDto registerStaff(group3.en.stuattendance.Usermanager.DTO.StaffCreateDto dto);
    UserDto registerTeacher(group3.en.stuattendance.Usermanager.DTO.TeacherCreateDto dto);
    UserDto registerStudent(group3.en.stuattendance.Usermanager.DTO.StudentCreateDto dto);
    Optional<User> getUserById(Integer userId);
    UserDto getUserDtoById(Integer userId);
    List<User> getAllStaff();
    List<UserDto> getAllStaffDtos();
    Optional<User> getUserByUsername(String username);
    Optional<User> getUserByEmail(String email);
    List<User> getAllUsers();
    List<UserDto> getAllUserDtos();
    Page<UserDto> getAllUsersPaginated(Pageable pageable);
    Page<UserDto> getAllStaffPaginated(Pageable pageable);
    UserDto updateUser(Integer userId, UserDto dto);
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
    void requestPasswordReset(String email);
    void changePassword(String currentPassword, String newPassword);
    void resetPassword(Integer userId, String newPassword);

    // Bulk Operations
    group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto bulkImportStaff(org.springframework.web.multipart.MultipartFile file, boolean dryRun);
    group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto bulkImportStudents(org.springframework.web.multipart.MultipartFile file, Integer classroomId, boolean dryRun);
}
