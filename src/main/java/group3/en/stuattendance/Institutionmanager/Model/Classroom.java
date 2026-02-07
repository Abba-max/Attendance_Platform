package group3.en.stuattendance.Institutionmanager.Model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "classrooms")
@Data
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

    @Column(length = 50)
    private String level;

    private Integer capacity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnore
    private Department department;

    @OneToMany(mappedBy = "classroom", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Student> students = new HashSet<>();

    @OneToMany(mappedBy = "classroom", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Session> sessions = new HashSet<>();

    public boolean isAtCapacity() {
        return students != null && students.size() >= capacity;
    }
}