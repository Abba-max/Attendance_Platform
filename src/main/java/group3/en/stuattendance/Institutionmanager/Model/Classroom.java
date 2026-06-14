package group3.en.stuattendance.Institutionmanager.Model;

import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Usermanager.Model.User;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "classrooms")
@NoArgsConstructor
public class Classroom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "class_id")
    private Integer classId;

    @Column(length = 100)
    private String name;

    @Column
    private Integer level;

    private Integer capacity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "speciality_id")
    @NotFound(action = NotFoundAction.IGNORE)
    @JsonIgnore
    private Speciality speciality;

    @OneToMany(mappedBy = "classroom")
    @org.hibernate.annotations.BatchSize(size = 100)
    @JsonIgnore
    private Set<User> students = new HashSet<>();

    @ManyToMany(mappedBy = "staffClassrooms")
    @JsonIgnore
    private Set<User> staff = new HashSet<>();

    @OneToMany(mappedBy = "classroom", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Session> sessions = new HashSet<>();

    // All-args constructor
    public Classroom(Integer classId, String name, Integer level, Integer capacity,
                     Speciality speciality, Set<User> students, Set<User> staff, Set<Session> sessions) {
        this.classId = classId;
        this.name = name;
        this.level = level;
        this.capacity = capacity;
        this.speciality = speciality;
        this.students = students != null ? students : new HashSet<>();
        this.staff = staff != null ? staff : new HashSet<>();
        this.sessions = sessions != null ? sessions : new HashSet<>();
    }

    // Getters
    public Integer getClassId() { return classId; }
    public String getName() { return name; }
    public Integer getLevel() { return level; }
    public Integer getCapacity() { return capacity; }
    public Speciality getSpeciality() { return speciality; }
    public Set<User> getStudents() { return students; }
    public Set<User> getStaff() { return staff; }
    public Set<Session> getSessions() { return sessions; }

    // Setters
    public void setClassId(Integer classId) { this.classId = classId; }
    public void setName(String name) { this.name = name; }
    public void setLevel(Integer level) { this.level = level; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public void setSpeciality(Speciality speciality) { this.speciality = speciality; }
    public void setStudents(Set<User> students) { this.students = students; }
    public void setStaff(Set<User> staff) { this.staff = staff; }
    public void setSessions(Set<Session> sessions) { this.sessions = sessions; }

    // Builder
    public static ClassroomBuilder builder() { return new ClassroomBuilder(); }

    public static class ClassroomBuilder {
        private Integer classId;
        private String name;
        private Integer level;
        private Integer capacity;
        private Speciality speciality;
        private Set<User> students = new HashSet<>();
        private Set<User> staff = new HashSet<>();
        private Set<Session> sessions = new HashSet<>();

        public ClassroomBuilder classId(Integer classId) { this.classId = classId; return this; }
        public ClassroomBuilder name(String name) { this.name = name; return this; }
        public ClassroomBuilder level(Integer level) { this.level = level; return this; }
        public ClassroomBuilder capacity(Integer capacity) { this.capacity = capacity; return this; }
        public ClassroomBuilder speciality(Speciality speciality) { this.speciality = speciality; return this; }
        public ClassroomBuilder students(Set<User> students) { this.students = students; return this; }
        public ClassroomBuilder staff(Set<User> staff) { this.staff = staff; return this; }
        public ClassroomBuilder sessions(Set<Session> sessions) { this.sessions = sessions; return this; }

        public Classroom build() {
            return new Classroom(classId, name, level, capacity, speciality, students, staff, sessions);
        }
    }

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