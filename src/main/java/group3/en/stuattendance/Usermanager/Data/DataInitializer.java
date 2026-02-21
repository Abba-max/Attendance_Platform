package group3.en.stuattendance.Usermanager.Data;

import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        seedInstitutions();
        seedRoles();
        seedPermissions();
        seedAdminUser();
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
        // MODIFIÉ — ROLE_ devant chaque nom
        String[] roles = {"ROLE_ADMIN", "ROLE_TEACHER", "ROLE_SUPERVISOR", "ROLE_PEDAGOG", "ROLE_STUDENT"};
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
    private void seedAdminUser(){
        if (userRepository.findByUsername("admin").isEmpty()){

            Role adminrole = roleRepository.findByName("ROLE_ADMIN")
                    .orElseThrow(() -> new RuntimeException("Role ROLE_ADMIN introuvable"));
            Institution institution = institutionRepository.findById(1).orElseThrow(() -> new RuntimeException("Insttitution introuvable"));

            User admin = User.builder()
                    .username("admin")
                    .email("admin@attendee.com")
                    .password(passwordEncoder.encode("admin123"))
                    .isActive(true)
                    .roles(new HashSet<>(java.util.Collections.singleton(adminrole)))
                    .institution(institution)
                    .build();

                    userRepository.save(admin);
                    System.out.println(" User  created.");
                    System.out.println(" Username : admin");
                    System.out.println(" Password : admin123");
        }else {
            System.out.println(" User admin present in BDD");
        }
    }
}
