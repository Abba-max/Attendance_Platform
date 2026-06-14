package group3.en.stuattendance.config;

import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.RoleRepository;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Component
public class AdminDataInitialiser implements CommandLineRunner {

    // L'email et le mot de passe viennent de ton fichier application.properties
    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.password}")
    private String adminPassword;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminDataInitialiser(UserRepository userRepository,
                                RoleRepository roleRepository,
                                PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional //
    public void run(String... args) {

        System.out.println("Vérification des rôles et de l'administrateur par défaut...");

        // 1. Initialiser tous les rôles par défaut
        Role adminRole = createRoleIfNotFound("ADMIN", "Super Administrateur du système");
        createRoleIfNotFound("PEDAGOG", "Responsable Pédagogique");
        createRoleIfNotFound("TEACHER", "Enseignant");
        createRoleIfNotFound("STUDENT", "Étudiant");

        // 2. On vérifie si l'admin existe déjà via son nom d'utilisateur
        if (userRepository.findByUsername(adminUsername).isEmpty()) {

            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);

            // 3. Construire l'utilisateur Admin
            User admin = User.builder()
                    .username(adminUsername)
                    .email(adminUsername + "@stuattendance.local") // dummy email
                    .firstName("Super")
                    .lastName("Admin")
                    .password(passwordEncoder.encode(adminPassword))
                    .isActive(true)
                    .roles(roles)
                    .build();

            // 4. Sauvegarder l'utilisateur
            userRepository.save(admin);

            System.out.println("SUCCÈS : Compte Admin créé avec succès !");
            System.out.println("Nom d'utilisateur : " + adminUsername);
            System.out.println("Rôle attribué : ADMIN");

        } else {
            System.out.println("INFO : Le compte Admin existe déjà dans la base de données. Initialisation ignorée.");
        }
    }

    private Role createRoleIfNotFound(String name, String description) {
        return roleRepository.findByName(name)
                .orElseGet(() -> {
                    Role newRole = new Role();
                    newRole.setName(name);
                    newRole.setDescription(description);
                    return roleRepository.save(newRole);
                });
    }
}