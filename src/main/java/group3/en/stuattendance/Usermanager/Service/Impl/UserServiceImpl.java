package group3.en.stuattendance.Usermanager.Service.Impl;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Repository.InstitutionRepository;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto;
import group3.en.stuattendance.Usermanager.DTO.StaffCreateDto;
import group3.en.stuattendance.Usermanager.DTO.StudentCreateDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherCreateDto;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Mapper.UserMapper;
import group3.en.stuattendance.Usermanager.Model.Permission;
import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.PermissionRepository;
import group3.en.stuattendance.Usermanager.Repository.RoleRepository;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import group3.en.stuattendance.Usermanager.Service.UserService;
import group3.en.stuattendance.Usermanager.Service.EmailService;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Auditmanager.Annotation.Auditable;
import group3.en.stuattendance.Usermanager.Util.PasswordUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Collections;
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
    private final EmailService emailService;
    private final PermissionRepository permissionRepository;
    private final CourseRepository courseRepository;
    private final group3.en.stuattendance.Usermanager.Repository.PasswordResetRequestRepository passwordResetRequestRepository;

    @Override
    @Auditable(action = "USER_REGISTER", category = "USER_MANAGEMENT", severity = "INFO")
    public UserDto registerUser(UserDto dto) {
        Institution institution = dto.getInstitutionId() != null ?
                institutionRepository.findById(dto.getInstitutionId()).orElse(null) : null;

        Classroom studentClassroom = dto.getClassroomId() != null ?
                classroomRepository.findById(dto.getClassroomId()).orElse(null) : null;

        Set<Role> roles = dto.getRoleIds() != null ?
                new HashSet<>(roleRepository.findAllById(dto.getRoleIds())) : new HashSet<>();

        Set<Classroom> staffClassrooms = dto.getStaffClassroomIds() != null ?
                new HashSet<>(classroomRepository.findAllById(dto.getStaffClassroomIds())) : new HashSet<>();

        Set<Permission> additionalPermissions = dto.getAdditionalPermissionIds() != null ?
                new HashSet<>(permissionRepository.findAllById(dto.getAdditionalPermissionIds())) : new HashSet<>();

        Set<Permission> deniedPermissions = dto.getDeniedPermissionIds() != null ?
                new HashSet<>(permissionRepository.findAllById(dto.getDeniedPermissionIds())) : new HashSet<>();

        User user = userMapper.toEntity(dto, institution, studentClassroom, roles, staffClassrooms, additionalPermissions, deniedPermissions);
        if (user.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        return userMapper.toDto(userRepository.save(user));
    }

    @Override
    @Auditable(action = "STAFF_REGISTER", category = "USER_MANAGEMENT", severity = "INFO")
    public UserDto registerStaff(StaffCreateDto dto) {
        Institution institution = dto.getInstitutionId() != null ?
                institutionRepository.findById(dto.getInstitutionId()).orElse(null) : null;

        Set<Role> roles = dto.getRoleNames() != null ?
                dto.getRoleNames().stream()
                        .map(roleName -> roleRepository.findByName(roleName)
                                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Role not found: " + roleName)))
                        .collect(Collectors.toSet()) : new HashSet<>();

        String rawPassword = (dto.getPassword() == null || dto.getPassword().trim().isEmpty())
                ? PasswordUtils.generatePassword(dto.getFirstName())
                : dto.getPassword();

        User user = User.builder()
                .username(dto.getEmail())
                .email(dto.getEmail())
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .password(passwordEncoder.encode(rawPassword))
                .institution(institution)
                .roles(roles)
                .isActive(dto.getIsActive())
                .build();

        User savedUser = userRepository.save(user);
        emailService.sendAccountCredentialsEmail(savedUser.getEmail(), savedUser.getUsername(), rawPassword);
        return userMapper.toDto(savedUser);
    }

    @Override
    public UserDto registerTeacher(TeacherCreateDto dto) {
        Institution institution = dto.getInstitutionId() != null ?
                institutionRepository.findById(dto.getInstitutionId()).orElse(null) : null;

        Set<Classroom> staffClassrooms = dto.getClassroomIds() != null ?
                new HashSet<>(classroomRepository.findAllById(dto.getClassroomIds())) : new HashSet<>();

        Role teacherRole = roleRepository.findByName("TEACHER")
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Role TEACHER not found"));

        Set<Role> roles = new HashSet<>();
        roles.add(teacherRole);

        String rawPassword = (dto.getPassword() == null || dto.getPassword().trim().isEmpty())
                ? PasswordUtils.generatePassword(dto.getFirstName())
                : dto.getPassword();

        User user = User.builder()
                .username(dto.getEmail())
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
        emailService.sendAccountCredentialsEmail(savedUser.getEmail(), savedUser.getUsername(), rawPassword);
        return userMapper.toDto(savedUser);
    }

    @Override
    public UserDto registerStudent(StudentCreateDto dto) {
        Institution institution = dto.getInstitutionId() != null ?
                institutionRepository.findById(dto.getInstitutionId()).orElse(null) : null;

        Classroom classroom = dto.getClassroomId() != null ?
                classroomRepository.findById(dto.getClassroomId()).orElse(null) : null;

        Role studentRole = roleRepository.findByName("STUDENT")
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Role STUDENT not found"));

        Set<Role> roles = new HashSet<>();
        roles.add(studentRole);

        String rawPassword = (dto.getPassword() == null || dto.getPassword().trim().isEmpty())
                ? PasswordUtils.generatePassword(dto.getFirstName())
                : dto.getPassword();

        User user = User.builder()
                .username(dto.getEmail())
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
        emailService.sendAccountCredentialsEmail(savedUser.getEmail(), savedUser.getUsername(), rawPassword);
        return userMapper.toDto(savedUser);
    }

    @Override
    public List<User> getAllStaff() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRoles().stream()
                        .anyMatch(r -> !r.getName().equals("STUDENT")))
                .collect(Collectors.toList());
    }

    @Override
    public List<UserDto> getAllStaffDtos() {
        return getAllStaff().stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<User> getUserById(Integer userId) {
        return userRepository.findById(userId);
    }

    @Override
    public UserDto getUserDtoById(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found"));
        
        // Force initialization of lazy associations for students/staff/teachers
        if (user.getClassroom() != null) {
            user.getClassroom().getName();
            if (user.getClassroom().getSpeciality() != null) {
                user.getClassroom().getSpeciality().getName();
            }
        }
        
        // Initialize roles and their permissions for effective permissions calculation
        user.getRoles().forEach(role -> {
            role.getPermissions().size();
        });
        
        // Initialize associations for Pedagogic Assistants / Supervisors
        user.getStaffClassrooms().forEach(classroom -> {
            classroom.getName();
            if (classroom.getSpeciality() != null) {
                classroom.getSpeciality().getName();
                if (classroom.getSpeciality().getDepartment() != null) {
                    classroom.getSpeciality().getDepartment().getName();
                }
            }
        });
        
        // Initialize associations for Teachers
        user.getCourses().forEach(course -> {
            course.getCourseName();
        });
        
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
                .collect(Collectors.toList());
    }

    @Override
    public Page<UserDto> getAllUsersPaginated(Pageable pageable) {
        return userRepository.findAll(pageable).map(userMapper::toDto);
    }

    @Override
    public Page<UserDto> getAllStaffPaginated(Pageable pageable) {
        return userRepository.findAllStaff(pageable).map(userMapper::toDto);
    }

    @Override
    @Auditable(action = "USER_UPDATE", category = "USER_MANAGEMENT", severity = "INFO")
    public UserDto updateUser(Integer userId, UserDto dto) {
        User existingUser = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));

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
            existingUser.getRoles().clear();
            existingUser.getRoles().addAll(roleRepository.findAllById(dto.getRoleIds()));
        }

        if (dto.getAdditionalPermissionIds() != null) {
            existingUser.getAdditionalPermissions().clear();
            existingUser.getAdditionalPermissions().addAll(permissionRepository.findAllById(dto.getAdditionalPermissionIds()));
        }

        if (dto.getDeniedPermissionIds() != null) {
            existingUser.getDeniedPermissions().clear();
            existingUser.getDeniedPermissions().addAll(permissionRepository.findAllById(dto.getDeniedPermissionIds()));
        }

        if (dto.getClassroomId() != null) {
            existingUser.setClassroom(classroomRepository.findById(dto.getClassroomId()).orElse(null));
        }

        if (dto.getStaffClassroomIds() != null) {
            existingUser.getStaffClassrooms().clear();
            existingUser.getStaffClassrooms().addAll(classroomRepository.findAllById(dto.getStaffClassroomIds()));
        }

        return userMapper.toDto(userRepository.save(existingUser));
    }

    @Override
    public void grantPermission(Integer userId, Integer permissionId) {
        userRepository.findById(userId).ifPresent(user -> {
            // Check if permission is in role scope
            boolean inScope = user.getRoles().stream()
                .anyMatch(role -> role.getPermissions().stream()
                    .anyMatch(p -> p.getPermissionId().equals(permissionId)));
            
            if (!inScope) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Permission is outside of user's role scope");
            }

            permissionRepository.findById(permissionId).ifPresent(perm -> {
                user.getAdditionalPermissions().add(perm);
                user.getDeniedPermissions().remove(perm);
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
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Permission is outside of user's role scope");
            }

            permissionRepository.findById(permissionId).ifPresent(perm -> {
                user.getDeniedPermissions().add(perm);
                user.getAdditionalPermissions().remove(perm);
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
        if (!userRepository.existsById(userId)) {
            throw new EntityNotFoundException("User not found with id: " + userId);
        }
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
    public List<UserDto> getUsersByRole(String roleName) {
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
        List<Course> courses = courseRepository.findBySpecialitySpecialityId(specialityId);
        return courses.stream()
                .flatMap(course -> course.getTeachers().stream())
                .filter(teacher -> teacher != null)
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
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password does not match");
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
    public BulkImportResultDto bulkImportStaff(MultipartFile file, boolean dryRun) {
        BulkImportResultDto result = new BulkImportResultDto();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             com.opencsv.CSVReader csvReader = new com.opencsv.CSVReader(reader)) {

            List<String[]> rows = csvReader.readAll();
            if (rows.isEmpty()) return result;

            int startRow = 0;
            // Check for header row: firstName, lastName, email, role
            if (rows.get(0).length >= 4 && (rows.get(0)[0].equalsIgnoreCase("firstName") || rows.get(0)[2].equalsIgnoreCase("email"))) {
                startRow = 1;
            }

            result.setTotalRows(rows.size() - startRow);
            Institution institution = institutionRepository.findById(1).orElse(null);

            for (int i = startRow; i < rows.size(); i++) {
                String[] row = rows.get(i);
                int rowNum = i + 1;

                if (row.length < 4) {
                    result.getErrors().add(new BulkImportResultDto.RowError(rowNum, "N/A", "Missing columns. Required: firstName, lastName, email, role"));
                    result.setFailureCount(result.getFailureCount() + 1);
                    continue;
                }

                String firstName = row[0].trim();
                String lastName = row[1].trim();
                String email = row[2].trim();
                String roleName = row[3].trim().toUpperCase();

                try {
                    boolean alreadyExists = userRepository.findByEmail(email).isPresent();
                    if (alreadyExists) {
                        result.getErrors().add(new BulkImportResultDto.RowError(rowNum, email, "User with this email already exists"));
                        result.setFailureCount(result.getFailureCount() + 1);
                        continue;
                    }

                    if (!roleName.equals("PEDAGOG") && !roleName.equals("SUPERVISOR") && !roleName.equals("ADMIN") && !roleName.equals("TEACHER")) {
                        result.getErrors().add(new BulkImportResultDto.RowError(rowNum, email, "Invalid role: " + roleName + ". Must be PEDAGOG, SUPERVISOR, ADMIN, or TEACHER"));
                        result.setFailureCount(result.getFailureCount() + 1);
                        continue;
                    }

                    // Add to preview data
                    java.util.Map<String, String> previewRow = new java.util.HashMap<>();
                    previewRow.put("firstName", firstName);
                    previewRow.put("lastName", lastName);
                    previewRow.put("email", email);
                    previewRow.put("role", roleName);
                    result.getPreviewData().add(previewRow);

                    if (!dryRun) {
                        StaffCreateDto dto = StaffCreateDto.builder()
                                .firstName(firstName)
                                .lastName(lastName)
                                .email(email)
                                .roleNames(Collections.singleton(roleName))
                                .institutionId(institution != null ? institution.getInstitutionId() : null)
                                .isActive(true)
                                .build();

                        registerStaff(dto);
                    }
                    result.setSuccessCount(result.getSuccessCount() + 1);

                } catch (Exception e) {
                    result.getErrors().add(new BulkImportResultDto.RowError(rowNum, email, "System error: " + e.getMessage()));
                    result.setFailureCount(result.getFailureCount() + 1);
                }
            }

        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse CSV file: " + e.getMessage());
        }
        return result;
    }

    @Override
    @Auditable(action = "STUDENT_BULK_IMPORT", category = "USER_MANAGEMENT", severity = "INFO")
    public BulkImportResultDto bulkImportStudents(MultipartFile file, Integer classroomId, boolean dryRun) {
        BulkImportResultDto result = new BulkImportResultDto();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             com.opencsv.CSVReader csvReader = new com.opencsv.CSVReader(reader)) {

            List<String[]> rows = csvReader.readAll();
            if (rows.isEmpty()) return result;

            int startRow = 0;
            // Check for header row: firstName, lastName, email, matricule
            if (rows.get(0).length >= 4 && (rows.get(0)[0].equalsIgnoreCase("firstName") || rows.get(0)[3].equalsIgnoreCase("matricule"))) {
                startRow = 1;
            }

            result.setTotalRows(rows.size() - startRow);

            Classroom classroom = classroomRepository.findById(classroomId).orElse(null);
            Institution institution = (classroom != null && classroom.getSpeciality() != null && classroom.getSpeciality().getDepartment() != null)
                    ? classroom.getSpeciality().getDepartment().getInstitution()
                    : institutionRepository.findById(1).orElse(null);

            for (int i = startRow; i < rows.size(); i++) {
                String[] row = rows.get(i);
                int rowNum = i + 1;

                if (row.length < 4) {
                    result.getErrors().add(new BulkImportResultDto.RowError(rowNum, "N/A", "Missing columns. Required: firstName, lastName, email, matricule"));
                    result.setFailureCount(result.getFailureCount() + 1);
                    continue;
                }

                String firstName = row[0].trim();
                String lastName = row[1].trim();
                String email = row[2].trim();
                String matricule = row[3].trim();

                try {
                    if (userRepository.findByEmail(email).isPresent()) {
                        result.getErrors().add(new BulkImportResultDto.RowError(rowNum, email, "User with this email already exists"));
                        result.setFailureCount(result.getFailureCount() + 1);
                        continue;
                    }

                    // Add to preview data
                    java.util.Map<String, String> previewRow = new java.util.HashMap<>();
                    previewRow.put("firstName", firstName);
                    previewRow.put("lastName", lastName);
                    previewRow.put("email", email);
                    previewRow.put("matricule", matricule);
                    result.getPreviewData().add(previewRow);

                    if (!dryRun) {
                        StudentCreateDto dto = StudentCreateDto.builder()
                                .firstName(firstName)
                                .lastName(lastName)
                                .email(email)
                                .username(email)
                                .matricule(matricule)
                                .classroomId(classroomId)
                                .institutionId(institution != null ? institution.getInstitutionId() : null)
                                .isActive(true)
                                .build();

                        registerStudent(dto);
                    }
                    result.setSuccessCount(result.getSuccessCount() + 1);

                } catch (Exception e) {
                    result.getErrors().add(new BulkImportResultDto.RowError(rowNum, email, "Error: " + e.getMessage()));
                    result.setFailureCount(result.getFailureCount() + 1);
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse CSV: " + e.getMessage());
        }
        return result;
    }

    @Override
    public void toggleStudentDelegate(Integer userId, Boolean isDelegate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found with id: " + userId));

        boolean isStudent = user.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase("STUDENT"));
        if (!isStudent) {
            throw new IllegalArgumentException("User is not a student");
        }

        if (isDelegate != null && isDelegate) {
            if (user.getClassroom() != null) {
                long delegateCount = userRepository.countByClassroomClassIdAndIsDelegateTrue(user.getClassroom().getClassId());
                // If they are already a delegate, count doesn't change
                if (delegateCount >= 2 && !user.getIsDelegate()) {
                    throw new IllegalArgumentException("A classroom can only have up to two delegates.");
                }
            }
            user.setIsDelegate(true);
        } else {
            user.setIsDelegate(false);
        }
        userRepository.save(user);
    }
}