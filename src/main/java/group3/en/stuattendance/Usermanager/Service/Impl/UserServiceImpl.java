package group3.en.stuattendance.Usermanager.Service.Impl;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Repository.InstitutionRepository;
import group3.en.stuattendance.Usermanager.DTO.StaffCreateDto;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Mapper.UserMapper;
import group3.en.stuattendance.Usermanager.Model.Permission;
import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.PermissionRepository;
import group3.en.stuattendance.Usermanager.Repository.RoleRepository;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import group3.en.stuattendance.Usermanager.Service.UserService;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Auditmanager.Annotation.Auditable;
import group3.en.stuattendance.Usermanager.Util.PasswordUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
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
    private final BCryptPasswordEncoder passwordEncoder;
    private final group3.en.stuattendance.Usermanager.Service.EmailService emailService;
    private final PermissionRepository permissionRepository;
    private final CourseRepository courseRepository;
    private final group3.en.stuattendance.Usermanager.Repository.PasswordResetRequestRepository passwordResetRequestRepository;

    @Override
    @Auditable(action = "USER_REGISTER", category = "USER_MANAGEMENT", severity = "INFO")
    public User registerUser(UserDto dto) {
        Institution institution = dto.getInstitutionId() != null ? 
            institutionRepository.findById(dto.getInstitutionId()).orElse(null) : null;
        
        Classroom studentClassroom = dto.getClassroomId() != null ? 
            classroomRepository.findById(dto.getClassroomId()).orElse(null) : null;

        Set<Role> roles = dto.getRoleIds() != null ?
            new java.util.HashSet<>(roleRepository.findAllById(dto.getRoleIds())) : new java.util.HashSet<>();

        Set<Classroom> staffClassrooms = dto.getStaffClassroomIds() != null ?
            new java.util.HashSet<>(classroomRepository.findAllById(dto.getStaffClassroomIds())) : new java.util.HashSet<>();

        Set<Permission> additionalPermissions = dto.getAdditionalPermissionIds() != null ?
            new java.util.HashSet<>(permissionRepository.findAllById(dto.getAdditionalPermissionIds())) : new java.util.HashSet<>();

        Set<Permission> deniedPermissions = dto.getDeniedPermissionIds() != null ?
            new java.util.HashSet<>(permissionRepository.findAllById(dto.getDeniedPermissionIds())) : new java.util.HashSet<>();

        User user = userMapper.toEntity(dto, institution, studentClassroom, roles, staffClassrooms, additionalPermissions, deniedPermissions);
        if (user.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        return userRepository.save(user);
    }

    @Override
    @Auditable(action = "STAFF_REGISTER", category = "USER_MANAGEMENT", severity = "INFO")
    public User registerStaff(StaffCreateDto dto) {
        Institution institution = dto.getInstitutionId() != null ?
            institutionRepository.findById(dto.getInstitutionId()).orElse(null) : null;

        Set<Role> roles = dto.getRoleNames() != null ?
            dto.getRoleNames().stream()
                .map(roleName -> roleRepository.findByName(roleName)
                    .orElseThrow(() -> new RuntimeException("Role not found: " + roleName)))
                .collect(java.util.stream.Collectors.toSet()) : new java.util.HashSet<>();

        // Handle password generation
        String rawPassword = (dto.getPassword() == null || dto.getPassword().trim().isEmpty())
            ? PasswordUtils.generatePassword(dto.getFirstName())
            : dto.getPassword();

        User user = User.builder()
                .username(dto.getEmail()) // Username = Email
                .email(dto.getEmail())
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .password(passwordEncoder.encode(rawPassword))
                .institution(institution)
                .roles(roles)
                .isActive(dto.getIsActive())
                .build();

        User savedUser = userRepository.save(user);

        // Notify user via email
        emailService.sendAccountCredentialsEmail(savedUser.getEmail(), savedUser.getUsername(), rawPassword);

        return savedUser;
    }

    @Override
    public User registerTeacher(group3.en.stuattendance.Usermanager.DTO.TeacherCreateDto dto) {
        Institution institution = dto.getInstitutionId() != null ?
            institutionRepository.findById(dto.getInstitutionId()).orElse(null) : null;

        Set<Classroom> staffClassrooms = dto.getClassroomIds() != null ?
            new java.util.HashSet<>(classroomRepository.findAllById(dto.getClassroomIds())) : new java.util.HashSet<>();

        Role teacherRole = roleRepository.findByName("TEACHER")
                .orElseThrow(() -> new RuntimeException("Role TEACHER not found"));

        Set<Role> roles = new HashSet<>();
        roles.add(teacherRole);

        // Handle password generation
        String rawPassword = (dto.getPassword() == null || dto.getPassword().trim().isEmpty())
            ? PasswordUtils.generatePassword(dto.getFirstName())
            : dto.getPassword();

        User user = User.builder()
                .username(dto.getEmail()) // Username = Email
                .email(dto.getEmail())
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .password(passwordEncoder.encode(rawPassword))
                .institution(institution)
                .roles(roles)
                .staffClassrooms(staffClassrooms)
                .isActive(dto.getIsActive())
                .build();

        User savedUser = userRepository.save(user);

        // Notify user via email
        emailService.sendAccountCredentialsEmail(savedUser.getEmail(), savedUser.getUsername(), rawPassword);

        return savedUser;
    }

    @Override
    public User registerStudent(group3.en.stuattendance.Usermanager.DTO.StudentCreateDto dto) {
        Institution institution = dto.getInstitutionId() != null ?
            institutionRepository.findById(dto.getInstitutionId()).orElse(null) : null;

        Classroom classroom = dto.getClassroomId() != null ?
            classroomRepository.findById(dto.getClassroomId()).orElse(null) : null;

        Role studentRole = roleRepository.findByName("STUDENT")
                .orElseThrow(() -> new RuntimeException("Role STUDENT not found"));

        Set<Role> roles = new HashSet<>();
        roles.add(studentRole);

        // Handle password generation
        String rawPassword = (dto.getPassword() == null || dto.getPassword().trim().isEmpty())
          ? PasswordUtils.generatePassword(dto.getFirstName())
            : dto.getPassword();

        User user = User.builder()
                .username(dto.getEmail()) // Username = Email
                .email(dto.getEmail())
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .password(passwordEncoder.encode(rawPassword))
                .matricule(dto.getMatricule())
                .institution(institution)
                .classroom(classroom)
                .roles(roles)
                .isActive(dto.getIsActive())
                .build();

        User savedUser = userRepository.save(user);

        // Notify user via email
        emailService.sendAccountCredentialsEmail(savedUser.getEmail(), savedUser.getUsername(), rawPassword);

        return savedUser;
    }

    @Override
    public List<User> getAllStaff() {
        return userRepository.findAll().stream()
            .filter(u -> u.getRoles().stream()
                .anyMatch(r -> !r.getName().equals("STUDENT")))
            .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public List<UserDto> getAllStaffDtos() {
        return getAllStaff().stream()
            .map(userMapper::toDto)
            .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public Optional<User> getUserById(Integer userId) {
        return userRepository.findById(userId);
    }

    @Override
    public UserDto getUserDtoById(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        // Mapping inside @Transactional method ensures lazy collections are loaded
        return userMapper.toDto(user);
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
    public List<UserDto> getAllUserDtos() {
        return userRepository.findAll().stream()
            .map(userMapper::toDto)
            .collect(java.util.stream.Collectors.toList());
    }

    @Override
    @Auditable(action = "USER_UPDATE", category = "USER_MANAGEMENT", severity = "INFO")
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

        if (dto.getAdditionalPermissionIds() != null) {
            existingUser.setAdditionalPermissions(new HashSet<>(permissionRepository.findAllById(dto.getAdditionalPermissionIds())));
        }

        if (dto.getDeniedPermissionIds() != null) {
            existingUser.setDeniedPermissions(new HashSet<>(permissionRepository.findAllById(dto.getDeniedPermissionIds())));
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
    public void grantPermission(Integer userId, Integer permissionId) {
        userRepository.findById(userId).ifPresent(user -> {
            // Check if permission is in role scope
            boolean inScope = user.getRoles().stream()
                .anyMatch(role -> role.getPermissions().stream()
                    .anyMatch(p -> p.getPermissionId().equals(permissionId)));
            
            if (!inScope) {
                throw new RuntimeException("Permission is outside of user's role scope");
            }

            permissionRepository.findById(permissionId).ifPresent(perm -> {
                user.getAdditionalPermissions().add(perm);
                user.getDeniedPermissions().remove(perm); // Ensure it's not also denied
                userRepository.save(user);
            });
        });
    }

    @Override
    public void revokePermission(Integer userId, Integer permissionId) {
        userRepository.findById(userId).ifPresent(user -> {
            // Check if permission is in role scope
            boolean inScope = user.getRoles().stream()
                .anyMatch(role -> role.getPermissions().stream()
                    .anyMatch(p -> p.getPermissionId().equals(permissionId)));
            
            if (!inScope) {
                throw new RuntimeException("Permission is outside of user's role scope");
            }

            permissionRepository.findById(permissionId).ifPresent(perm -> {
                user.getDeniedPermissions().add(perm);
                user.getAdditionalPermissions().remove(perm); // Ensure it's not also granted
                userRepository.save(user);
            });
        });
    }

    @Override
    public void clearPermissionOverride(Integer userId, Integer permissionId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.getAdditionalPermissions().removeIf(p -> p.getPermissionId().equals(permissionId));
            user.getDeniedPermissions().removeIf(p -> p.getPermissionId().equals(permissionId));
            userRepository.save(user);
        });
    }

    @Override
    public void clearPermissionOverrides(Integer userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.getAdditionalPermissions().clear();
            user.getDeniedPermissions().clear();
            userRepository.save(user);
        });
    }

    @Override
    @Auditable(action = "USER_DELETE", category = "USER_MANAGEMENT", severity = "WARNING")
    public void deleteUser(Integer userId) {
        userRepository.deleteById(userId);
    }

    @Override
    @Auditable(action = "USER_DEACTIVATE", category = "USER_MANAGEMENT", severity = "WARNING")
    public void deactivateUser(Integer userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setIsActive(false);
            userRepository.save(user);
        });
    }

    @Override
    @Auditable(action = "USER_ACTIVATE", category = "USER_MANAGEMENT", severity = "INFO")
    public void activateUser(Integer userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setIsActive(true);
            userRepository.save(user);
        });
    }

    @Override
    public List<group3.en.stuattendance.Usermanager.DTO.UserDto> getUsersByRole(String roleName) {
        return userRepository.findAll().stream()
            .filter(u -> u.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase(roleName) || r.getName().equalsIgnoreCase("ROLE_" + roleName)))
            .map(userMapper::toDto)
            .collect(Collectors.toList());
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
    public List<UserDto> getTeachersByClassroom(Integer classroomId) {
        return userRepository.findAll().stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName().equals("TEACHER")))
            .filter(u -> u.getStaffClassrooms().stream().anyMatch(c -> c.getClassId().equals(classroomId)))
            .map(userMapper::toDto)
            .collect(Collectors.toList());
    }
 
    @Override
    public List<UserDto> getTeachersBySpeciality(Integer specialityId) {
        return courseRepository.findBySpeciality_SpecialityId(specialityId).stream()
            .flatMap(course -> course.getTeachers().stream())
            .distinct()
            .map(userMapper::toDto)
            .collect(Collectors.toList());
    }

    @Override
    public void requestPasswordReset(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            group3.en.stuattendance.Usermanager.Model.PasswordResetRequest request = group3.en.stuattendance.Usermanager.Model.PasswordResetRequest.builder()
                    .user(user)
                    .status(group3.en.stuattendance.Usermanager.Model.PasswordResetRequest.RequestStatus.PENDING)
                    .build();
            passwordResetRequestRepository.save(request);
        });
    }

    @Override
    @Auditable(action = "PASSWORD_CHANGE", category = "SECURITY", severity = "INFO")
    public void changePassword(String currentPassword, String newPassword) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password does not match");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChanged(true);
        userRepository.save(user);
    }

    @Override
    @Auditable(action = "PASSWORD_RESET", category = "SECURITY", severity = "WARNING")
    public void resetPassword(Integer userId, String newPassword) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setPasswordChanged(false); // Force them to change it again
            userRepository.save(user);
        });
    }

    @Override
    @Auditable(action = "STAFF_BULK_IMPORT", category = "USER_MANAGEMENT", severity = "INFO")
    public group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto bulkImportStaff(org.springframework.web.multipart.MultipartFile file) {
        group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto result = new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto();
        
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()));
             com.opencsv.CSVReader csvReader = new com.opencsv.CSVReader(reader)) {
            
            List<String[]> rows = csvReader.readAll();
            result.setTotalRows(rows.size());

            // Get default institution (using ID 1 as per current logic)
            Institution institution = institutionRepository.findById(1).orElse(null);

            for (int i = 0; i < rows.size(); i++) {
                String[] row = rows.get(i);
                int rowNum = i + 1;

                if (row.length < 4) {
                    result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, "N/A", "Missing columns. Required: firstName, lastName, email, role"));
                    result.setFailureCount(result.getFailureCount() + 1);
                    continue;
                }

                String firstName = row[0].trim();
                String lastName = row[1].trim();
                String email = row[2].trim();
                String roleName = row[3].trim().toUpperCase();

                try {
                    // Check if user already exists
                    if (userRepository.findByEmail(email).isPresent()) {
                         result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, email, "User with this email already exists"));
                         result.setFailureCount(result.getFailureCount() + 1);
                         continue;
                    }

                    // Validate role
                    if (!roleName.equals("PEDAGOG") && !roleName.equals("SUPERVISOR")) {
                         result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, email, "Invalid role: " + roleName + ". Must be PEDAGOG or SUPERVISOR"));
                         result.setFailureCount(result.getFailureCount() + 1);
                         continue;
                    }

                    // Prepare DTO
                    StaffCreateDto dto = StaffCreateDto.builder()
                            .firstName(firstName)
                            .lastName(lastName)
                            .email(email)
                            .roleNames(java.util.Collections.singleton(roleName))
                            .institutionId(institution != null ? institution.getInstitutionId() : null)
                            .isActive(true)
                            .build();

                    // Process registration
                    registerStaff(dto);
                    result.setSuccessCount(result.getSuccessCount() + 1);

                } catch (Exception e) {
                    result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, email, "System error: " + e.getMessage()));
                    result.setFailureCount(result.getFailureCount() + 1);
                }
            }

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV file: " + e.getMessage());
        }
        return result;
    }

    @Override
    @Auditable(action = "STUDENT_BULK_IMPORT", category = "USER_MANAGEMENT", severity = "INFO")
    public group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto bulkImportStudents(org.springframework.web.multipart.MultipartFile file, Integer classroomId) {
        group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto result = new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto();
        
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()));
             com.opencsv.CSVReader csvReader = new com.opencsv.CSVReader(reader)) {
            
            List<String[]> rows = csvReader.readAll();
            result.setTotalRows(rows.size());

            Classroom classroom = classroomRepository.findById(classroomId).orElse(null);
            Institution institution = (classroom != null && classroom.getSpeciality() != null && classroom.getSpeciality().getDepartment() != null) 
                ? classroom.getSpeciality().getDepartment().getInstitution() : institutionRepository.findById(1).orElse(null);

            for (int i = 0; i < rows.size(); i++) {
                String[] row = rows.get(i);
                int rowNum = i + 1;

                if (row.length < 4) {
                    result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, "N/A", "Missing columns. Required: firstName, lastName, email, matricule"));
                    result.setFailureCount(result.getFailureCount() + 1);
                    continue;
                }

                String firstName = row[0].trim();
                String lastName = row[1].trim();
                String email = row[2].trim();
                String matricule = row[3].trim();
                // Username is always email now

                try {
                    if (userRepository.findByEmail(email).isPresent()) {
                         result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, email, "User with this email already exists"));
                         result.setFailureCount(result.getFailureCount() + 1);
                         continue;
                    }

                    group3.en.stuattendance.Usermanager.DTO.StudentCreateDto dto = group3.en.stuattendance.Usermanager.DTO.StudentCreateDto.builder()
                            .firstName(firstName)
                            .lastName(lastName)
                            .email(email)
                            .username(email) // Align with single registration logic (Username = Email)
                            .matricule(matricule)
                            .classroomId(classroomId)
                            .institutionId(institution != null ? institution.getInstitutionId() : null)
                            .isActive(true)
                            .build();

                    registerStudent(dto);
                    result.setSuccessCount(result.getSuccessCount() + 1);

                } catch (Exception e) {
                    result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, email, "Error: " + e.getMessage()));
                    result.setFailureCount(result.getFailureCount() + 1);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV: " + e.getMessage());
        }
        return result;
    }
}
