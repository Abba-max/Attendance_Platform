package group3.en.stuattendance.Usermanager.Data;

import group3.en.stuattendance.Usermanager.Model.Permission;
import group3.en.stuattendance.Usermanager.Model.Role;
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

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        seedRoles();
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
}
