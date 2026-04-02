package group3.en.stuattendance.Usermanager.Mapper;

import group3.en.stuattendance.Usermanager.DTO.PermissionDto;
import group3.en.stuattendance.Usermanager.DTO.RoleDto;
import group3.en.stuattendance.Usermanager.Model.Role;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class RoleMapper {

    public RoleDto toDto(Role role) {
        if (role == null) return null;
        return RoleDto.builder()
                .roleId(role.getRoleId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(role.getPermissions().stream()
                        .map(permission -> PermissionDto.builder()
                                .permissionId(permission.getPermissionId())
                                .name(permission.getName())
                                .description(permission.getDescription())
                                .build())
                        .collect(Collectors.toSet()))
                .build();
    }

    public Role toEntity(RoleDto dto) {
        if (dto == null) return null;
        return Role.builder()
                .roleId(dto.getRoleId())
                .name(dto.getName())
                .description(dto.getDescription())
                .build();
    }
}