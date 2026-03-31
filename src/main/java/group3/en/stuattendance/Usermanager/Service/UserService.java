package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto;
import group3.en.stuattendance.Usermanager.DTO.StaffCreateDto;
import group3.en.stuattendance.Usermanager.DTO.StudentCreateDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherCreateDto;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

public interface UserService {

    // Basic User Management
    UserDto registerUser(UserDto dto);
    UserDto registerStaff(StaffCreateDto dto);
    UserDto registerTeacher(TeacherCreateDto dto);
    UserDto registerStudent(StudentCreateDto dto);
    UserDto getUserById(Integer userId);
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
    void changePassword(String currentPassword, String newPassword);
    void requestPasswordReset(String email);
    void resetPassword(Integer userId, String newPassword);

    // Bulk Operations
    BulkImportResultDto bulkImportStaff(MultipartFile file);
    BulkImportResultDto bulkImportStudents(MultipartFile file, Integer classroomId);
}