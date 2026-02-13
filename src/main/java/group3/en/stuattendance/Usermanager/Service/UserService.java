package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.User;

import java.util.List;

public interface UserService {
    User getUserById(Integer userId);
    User getUserByUsername(String username);
    User getUserByEmail(String email);
    void updateUser(Integer userId, UserDto dto);
    void changePassword(Integer userId, String oldPassword, String newPassword);
    void deactivateUser(Integer userId);
    void activateUser(Integer userId);
    List<User> getAllUsers();
    List<User> getActiveUsers();
}
