package group3.en.stuattendance.Usermanager.Service.Impl;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Repository.InstitutionRepository;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Mapper.UserMapper;
import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.RoleRepository;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import group3.en.stuattendance.Usermanager.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final InstitutionRepository institutionRepository;
    private final ClassroomRepository classroomRepository;
    private final UserMapper userMapper;

    @Override
    public User registerUser(UserDto dto) {
        Institution institution = dto.getInstitutionId() != null ? 
            institutionRepository.findById(dto.getInstitutionId()).orElse(null) : null;
        
        Classroom studentClassroom = dto.getClassroomId() != null ? 
            classroomRepository.findById(dto.getClassroomId()).orElse(null) : null;

        Set<Role> roles = dto.getRoleIds() != null ? 
            new HashSet<>(roleRepository.findAllById(dto.getRoleIds())) : new HashSet<>();

        Set<Classroom> staffClassrooms = dto.getStaffClassroomIds() != null ? 
            new HashSet<>(classroomRepository.findAllById(dto.getStaffClassroomIds())) : new HashSet<>();

        User user = userMapper.toEntity(dto, institution, studentClassroom, roles, staffClassrooms);
        // Password hashing should be done here in a real app
        return userRepository.save(user);
    }

    @Override
    public Optional<User> getUserById(Integer userId) {
        return userRepository.findById(userId);
    }

    @Override
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Override
    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public User updateUser(Integer userId, UserDto dto) {
        User existingUser = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        existingUser.setUsername(dto.getUsername());
        existingUser.setEmail(dto.getEmail());
        existingUser.setIsActive(dto.getIsActive());
        existingUser.setMatricule(dto.getMatricule());
        existingUser.setExternalEmail(dto.getExternalEmail());
        existingUser.setJoinCode(dto.getJoinCode());

        if (dto.getInstitutionId() != null) {
            existingUser.setInstitution(institutionRepository.findById(dto.getInstitutionId()).orElse(null));
        }

        if (dto.getRoleIds() != null) {
            existingUser.setRoles(new HashSet<>(roleRepository.findAllById(dto.getRoleIds())));
        }

        if (dto.getClassroomId() != null) {
            existingUser.setClassroom(classroomRepository.findById(dto.getClassroomId()).orElse(null));
        }

        if (dto.getStaffClassroomIds() != null) {
            existingUser.setStaffClassrooms(new HashSet<>(classroomRepository.findAllById(dto.getStaffClassroomIds())));
        }

        return userRepository.save(existingUser);
    }

    @Override
    public void deleteUser(Integer userId) {
        userRepository.deleteById(userId);
    }

    @Override
    public void deactivateUser(Integer userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setIsActive(false);
            userRepository.save(user);
        });
    }

    @Override
    public void activateUser(Integer userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setIsActive(true);
            userRepository.save(user);
        });
    }

    @Override
    public void assignRole(Integer userId, Integer roleId) {
        userRepository.findById(userId).ifPresent(user -> {
            roleRepository.findById(roleId).ifPresent(role -> {
                user.getRoles().add(role);
                userRepository.save(user);
            });
        });
    }

    @Override
    public void removeRole(Integer userId, Integer roleId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.getRoles().removeIf(role -> role.getRoleId().equals(roleId));
            userRepository.save(user);
        });
    }

    @Override
    public Optional<User> getUserByMatricule(String matricule) {
        return userRepository.findByMatricule(matricule);
    }

    @Override
    public List<User> getStudentsByClassroom(Integer classroomId) {
        return classroomRepository.findById(classroomId)
            .map(classroom -> userRepository.findAll().stream()
                .filter(u -> u.getClassroom() != null && u.getClassroom().getClassId().equals(classroomId))
                .collect(Collectors.toList()))
            .orElse(List.of());
    }

    @Override
    public void assignStudentToClassroom(Integer userId, Integer classroomId) {
        userRepository.findById(userId).ifPresent(user -> {
            classroomRepository.findById(classroomId).ifPresent(classroom -> {
                user.setClassroom(classroom);
                userRepository.save(user);
            });
        });
    }

    @Override
    public Optional<User> getUserByJoinCode(String joinCode) {
        return userRepository.findByJoinCode(joinCode);
    }

    @Override
    public void assignStaffToClassroom(Integer userId, Integer classroomId) {
        userRepository.findById(userId).ifPresent(user -> {
            classroomRepository.findById(classroomId).ifPresent(classroom -> {
                user.getStaffClassrooms().add(classroom);
                userRepository.save(user);
            });
        });
    }

    @Override
    public void resetPassword(Integer userId, String newPassword) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setPassword(newPassword); // Should hash in real app
            userRepository.save(user);
        });
    }
}
