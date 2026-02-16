package group3.en.stuattendance.Usermanager.Data;

import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Usermanager.Model.Permission;
import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Institutionmanager.Repository.InstitutionRepository;
import group3.en.stuattendance.Usermanager.Repository.PermissionRepository;
import group3.en.stuattendance.Usermanager.Repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final InstitutionRepository institutionRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        seedInstitutions();
        seedRoles();
        seedPermissions();
    }

    private void seedInstitutions() {
        if (institutionRepository.findById(1).isEmpty()) {
            institutionRepository.save(Institution.builder()
                    .name("SJI")
                    .location("Eyang & Etokoss")
                    .build());
        }
    }

    private void seedRoles() {
        String[] roles = {"ADMIN", "TEACHER", "SUPERVISOR", "PEDAGOG", "STUDENT"};
        for (String roleName : roles) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.save(Role.builder()
                        .name(roleName)
                        .description("Default role for " + roleName.toLowerCase())
                        .build());
            }
        }
    }

    private void seedPermissions() {
        String[] permissions = {
            "MANAGE_USERS", "MANAGE_ROLES", "MANAGE_INSTITUTIONS",
            "RECORD_ATTENDANCE", "VIEW_REPORTS", "MANAGE_COURSES",
            "SCAN_QR", "GENERATE_QR"
        };
        for (String permName : permissions) {
            if (permissionRepository.findByName(permName).isEmpty()) {
                permissionRepository.save(Permission.builder()
                        .name(permName)
                        .description("System permission to " + permName.toLowerCase().replace("_", " "))
                        .build());
            }
        }
    }
}
