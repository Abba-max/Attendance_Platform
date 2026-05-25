package group3.en.stuattendance.Institutionmanager.Model;

import group3.en.stuattendance.Usermanager.Model.User;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "institutions")
@EntityListeners(AuditingEntityListener.class)
public class Institution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "institution_id")
    private Integer institutionId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String location;

    @OneToMany(mappedBy = "institution", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<User> users = new HashSet<>();

    @OneToMany(mappedBy = "institution", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Department> departments = new HashSet<>();

    @Column(name = "geofence_data", columnDefinition = "TEXT")
    private String geofenceData;

    @Column(name = "geofencing_enabled")
    private Boolean geofencingEnabled = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // No-args constructor
    public Institution() {}

    // All-args constructor
    public Institution(Integer institutionId, String name, String location,
                       Set<User> users, Set<Department> departments,
                       String geofenceData, Boolean geofencingEnabled,
                       LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.institutionId = institutionId;
        this.name = name;
        this.location = location;
        this.users = users != null ? users : new HashSet<>();
        this.departments = departments != null ? departments : new HashSet<>();
        this.geofenceData = geofenceData;
        this.geofencingEnabled = geofencingEnabled != null ? geofencingEnabled : false;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters
    public Integer getInstitutionId() { return institutionId; }
    public String getName() { return name; }
    public String getLocation() { return location; }
    public Set<User> getUsers() { return users; }
    public Set<Department> getDepartments() { return departments; }
    public String getGeofenceData() { return geofenceData; }
    public Boolean getGeofencingEnabled() { return geofencingEnabled; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    // Setters
    public void setInstitutionId(Integer institutionId) { this.institutionId = institutionId; }
    public void setName(String name) { this.name = name; }
    public void setLocation(String location) { this.location = location; }
    public void setUsers(Set<User> users) { this.users = users; }
    public void setDepartments(Set<Department> departments) { this.departments = departments; }
    public void setGeofenceData(String geofenceData) { this.geofenceData = geofenceData; }
    public void setGeofencingEnabled(Boolean geofencingEnabled) { this.geofencingEnabled = geofencingEnabled; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Builder
    public static InstitutionBuilder builder() { return new InstitutionBuilder(); }

    public static class InstitutionBuilder {
        private Integer institutionId;
        private String name;
        private String location;
        private Set<User> users = new HashSet<>();
        private Set<Department> departments = new HashSet<>();
        private String geofenceData;
        private Boolean geofencingEnabled = false;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public InstitutionBuilder institutionId(Integer institutionId) { this.institutionId = institutionId; return this; }
        public InstitutionBuilder name(String name) { this.name = name; return this; }
        public InstitutionBuilder location(String location) { this.location = location; return this; }
        public InstitutionBuilder users(Set<User> users) { this.users = users; return this; }
        public InstitutionBuilder departments(Set<Department> departments) { this.departments = departments; return this; }
        public InstitutionBuilder geofenceData(String geofenceData) { this.geofenceData = geofenceData; return this; }
        public InstitutionBuilder geofencingEnabled(Boolean geofencingEnabled) { this.geofencingEnabled = geofencingEnabled; return this; }
        public InstitutionBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public InstitutionBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public Institution build() {
            return new Institution(institutionId, name, location, users, departments,
                    geofenceData, geofencingEnabled, createdAt, updatedAt);
        }
    }

    @Override
    public String toString() {
        return "Institution{institutionId=" + institutionId + ", name='" + name + "'}";
    }
}