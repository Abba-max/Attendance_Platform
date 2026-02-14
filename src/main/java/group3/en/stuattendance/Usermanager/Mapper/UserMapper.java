package group3.en.stuattendance.Usermanager.Mapper;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class UserMapper {

    public UserDto toDto(User user) {
        if (user == null) return null;
        return UserDto.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .isActive(user.getIsActive())
                .institutionId(user.getInstitution() != null ? user.getInstitution().getInstitutionId() : null)
                .roleIds(user.getRoles().stream().map(Role::getRoleId).collect(Collectors.toSet()))
                .classroomId(user.getClassroom() != null ? user.getClassroom().getClassId() : null)
                .matricule(user.getMatricule())
                .externalEmail(user.getExternalEmail())
                .staffClassroomIds(user.getStaffClassrooms().stream().map(Classroom::getClassId).collect(Collectors.toSet()))
                .joinCode(user.getJoinCode())
                .build();
    }

    public User toEntity(UserDto dto, Institution institution, Classroom studentClassroom, Set<Role> roles, Set<Classroom> staffClassrooms) {
        if (dto == null) return null;
        User user = User.builder()
                .userId(dto.getUserId())
                .username(dto.getUsername())
                .email(dto.getEmail())
                .isActive(dto.getIsActive())
                .institution(institution)
                .roles(roles != null ? roles : new HashSet<>())
                .classroom(studentClassroom)
                .matricule(dto.getMatricule())
                .externalEmail(dto.getExternalEmail())
                .staffClassrooms(staffClassrooms != null ? staffClassrooms : new HashSet<>())
                .joinCode(dto.getJoinCode())
                .build();
        return user;
    }
}
