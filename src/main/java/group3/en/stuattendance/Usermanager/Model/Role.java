package group3.en.stuattendance.Usermanager.Model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Integer roleId;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 255)
    private String description;

    @ManyToMany
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();

    @JsonIgnore
    @ManyToMany(mappedBy = "roles")
    private Set<User> users = new HashSet<>();

    public Role() {}

    public Role(Integer roleId, String name, String description, Set<Permission> permissions, Set<User> users) {
        this.roleId = roleId;
        this.name = name;
        this.description = description;
        this.permissions = permissions;
        this.users = users;
    }

    public static RoleBuilder builder() {
        return new RoleBuilder();
    }

    // Getters and Setters
    public Integer getRoleId() { return roleId; }
    public void setRoleId(Integer roleId) { this.roleId = roleId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Set<Permission> getPermissions() { return permissions; }
    public void setPermissions(Set<Permission> permissions) { this.permissions = permissions; }

    public Set<User> getUsers() { return users; }
    public void setUsers(Set<User> users) { this.users = users; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Role role = (Role) o;
        return Objects.equals(roleId, role.roleId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(roleId);
    }

    public static class RoleBuilder {
        private Integer roleId;
        private String name;
        private String description;
        private Set<Permission> permissions = new HashSet<>();
        private Set<User> users = new HashSet<>();

        public RoleBuilder roleId(Integer roleId) { this.roleId = roleId; return this; }
        public RoleBuilder name(String name) { this.name = name; return this; }
        public RoleBuilder description(String description) { this.description = description; return this; }
        public RoleBuilder permissions(Set<Permission> permissions) { this.permissions = permissions; return this; }
        public RoleBuilder users(Set<User> users) { this.users = users; return this; }

        public Role build() {
            return new Role(roleId, name, description, permissions, users);
        }
    }
}
