package group3.en.stuattendance.Usermanager.Authentication;

import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    // @Transactional est nécessaire car user.getRoles() est chargé en LAZY
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        // 1. Chercher l'utilisateur par username
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Utilisateur introuvable : " + username
                ));

        // 2. Convert RBAC (Roles + Permissions) into GrantedAuthority
        Set<SimpleGrantedAuthority> authorities = new HashSet<>();
        
        // Roles + Role's Permissions
        user.getRoles().forEach(role -> {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName()));
            role.getPermissions().forEach(perm -> {
                authorities.add(new SimpleGrantedAuthority(perm.getName()));
            });
        });

        // Manual Additional Permissions
        user.getAdditionalPermissions().forEach(perm -> {
            authorities.add(new SimpleGrantedAuthority(perm.getName()));
        });

        // Manual Denied Permissions (Remove them)
        user.getDeniedPermissions().forEach(perm -> {
            authorities.remove(new SimpleGrantedAuthority(perm.getName()));
        });

        // 3. Retourner un UserDetails Spring Security
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                user.getIsActive(), // isEnabled → ton champ isActive
                true,               // accountNonExpired
                true,               // credentialsNonExpired
                true,               // accountNonLocked
                authorities
        );
    }
}