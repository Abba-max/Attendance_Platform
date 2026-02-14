package group3.en.stuattendance.Institutionmanager.Model;

import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Usermanager.Model.User;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "classrooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classroom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "class_id")
    private Integer classId;

    @Column(length = 100)
    private String name;

    @Column
    private Integer level; // e.g., 1, 2, 3

    private Integer capacity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnore
    private Department department;

    // Students in this classroom
    @OneToMany(mappedBy = "classroom")
    @JsonIgnore
    @Builder.Default
    private Set<User> students = new HashSet<>();

    // Staff (Teachers) associated with this classroom
    @ManyToMany(mappedBy = "staffClassrooms")
    @JsonIgnore
    @Builder.Default
    private Set<User> staff = new HashSet<>();

    @OneToMany(mappedBy = "classroom", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Session> sessions = new HashSet<>();

    public boolean isAtCapacity() {
        return students != null && students.size() >= capacity;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Classroom classroom = (Classroom) o;
        return Objects.equals(classId, classroom.classId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(classId);
    }
}