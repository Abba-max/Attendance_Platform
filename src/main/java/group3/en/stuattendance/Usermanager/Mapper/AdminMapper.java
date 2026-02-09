package group3.en.stuattendance.Usermanager.Mapper;

import group3.en.stuattendance.Usermanager.DTO.AdminDto;
import group3.en.stuattendance.Usermanager.Model.Admin;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import org.springframework.stereotype.Component;

@Component
public class AdminMapper {

    public AdminDto toDto(Admin admin) {
        if (admin == null) return null;
        return AdminDto.builder()
                .adminId(admin.getAdminId())
                .username(admin.getUsername())
                .email(admin.getEmail())
                .isActive(admin.getIsActive())
                .institutionId(admin.getInstitution() != null ? admin.getInstitution().getInstitutionId() : null)
                .build();
    }

    public Admin toEntity(AdminDto dto, Institution institution) {
        if (dto == null) return null;
        Admin admin = new Admin();
        admin.setAdminId(dto.getAdminId());
        admin.setUsername(dto.getUsername());
        admin.setEmail(dto.getEmail());
        admin.setIsActive(dto.getIsActive());
        admin.setInstitution(institution);
        return admin;
    }
}
