package group3.en.stuattendance.Institutionmanager.Model;

import jakarta.persistence.*;
import lombok.*;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "specialities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Speciality {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "speciality_id")
    private Integer specialityId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnore
    private Department department;

    @OneToMany(mappedBy = "speciality", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Classroom> classrooms = new HashSet<>();
    @OneToMany(mappedBy = "speciality", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Course> courses = new HashSet<>();


    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Speciality that = (Speciality) o;
        return Objects.equals(specialityId, that.specialityId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(specialityId);
    }
}
