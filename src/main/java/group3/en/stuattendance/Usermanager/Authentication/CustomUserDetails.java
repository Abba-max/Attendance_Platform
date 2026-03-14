package group3.en.stuattendance.Usermanager.Authentication;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

public class CustomUserDetails extends User {
    private final Integer userId;
    private final String firstName;
    private final String lastName;
    private final boolean passwordChanged;

    public CustomUserDetails(Integer userId, String firstName, String lastName, String username, String password, boolean enabled, boolean accountNonExpired,
                             boolean credentialsNonExpired, boolean accountNonLocked,
                             Collection<? extends GrantedAuthority> authorities, boolean passwordChanged) {
        super(username, password, enabled, accountNonExpired, credentialsNonExpired, accountNonLocked, authorities);
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.passwordChanged = passwordChanged;
    }

    public Integer getUserId() {
        return userId;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public boolean isPasswordChanged() {
        return passwordChanged;
    }
}
