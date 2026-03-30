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
    private String adminEmail;

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

        System.out.println("Vérification de l'administrateur par défaut...");

        // 1. On vérifie si l'admin existe déjà via son email
        if (userRepository.findByEmail(adminEmail).isEmpty()) {

            // 2. Chercher ou Créer le rôle ROLE_ADMIN
            // 2. Chercher ou Créer le rôle ADMIN (sans le préfixe)
            Role adminRole = roleRepository.findByName("ADMIN")
                    .orElseGet(() -> {
                        Role newRole = new Role();
                        newRole.setName("ADMIN"); //
                        newRole.setDescription("Super Administrateur du système");
                        return roleRepository.save(newRole);
                    });

            // 3. Préparer la liste des rôles
            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);

            // 4. Construire l'utilisateur Admin
            User admin = User.builder()
                    .username("super_user") // Correspond au nom que tu utilises pour te connecter
                    .email(adminEmail)
                    .firstName("Super")
                    .lastName("Admin")
                    .password(passwordEncoder.encode(adminPassword))
                    .isActive(true)
                    .roles(roles) //
                    .build();

            // 5. Sauvegarder l'utilisateur (la table de liaison user_roles sera mise à jour auto)
            userRepository.save(admin);

            System.out.println("SUCCÈS : Compte Admin créé avec succès !");
            System.out.println("Nom d'utilisateur : super_user");
            System.out.println("Email : " + adminEmail);
            System.out.println("Rôle attribué : ADMIN");

        } else {
            System.out.println("INFO : Le compte Admin existe déjà dans la base de données. Initialisation ignorée.");
        }
    }
}