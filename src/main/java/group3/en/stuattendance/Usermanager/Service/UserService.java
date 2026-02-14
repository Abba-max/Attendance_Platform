package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.User;
import java.util.List;
import java.util.Optional;

public interface UserService {
    // Basic User Management
    User registerUser(group3.en.stuattendance.Usermanager.DTO.UserDto dto);
    User registerStaff(group3.en.stuattendance.Usermanager.DTO.StaffCreateDto dto);
    Optional<User> getUserById(Integer userId);
    List<User> getAllStaff();
    Optional<User> getUserByUsername(String username);
    Optional<User> getUserByEmail(String email);
    List<User> getAllUsers();
    User updateUser(Integer userId, UserDto dto);
    void deleteUser(Integer userId);
    void deactivateUser(Integer userId);
    void activateUser(Integer userId);

    // Role and Permissions
    void assignRole(Integer userId, Integer roleId);
    void removeRole(Integer userId, Integer roleId);

    // Student Specific
    Optional<User> getUserByMatricule(String matricule);
    List<User> getStudentsByClassroom(Integer classroomId);
    void assignStudentToClassroom(Integer userId, Integer classroomId);

    // Teacher Specific
    Optional<User> getUserByJoinCode(String joinCode);
    void assignStaffToClassroom(Integer userId, Integer classroomId);
    
    // Auth related
    void resetPassword(Integer userId, String newPassword);
}
