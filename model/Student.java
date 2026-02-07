package group3.en.stuattendance.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "students", indexes = {
        @Index(name = "idx_matricule", columnList = "matricule")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@PrimaryKeyJoinColumn(name = "user_id")
public class Student extends User {

    @Column(name = "matricule", unique = true, nullable = false, length = 50)
    private String matricule;

    @Column(name = "external_email", length = 100)
    private String externalEmail;

    @Column(name = "student_id")
    private Integer studentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    @JsonIgnore
    private Classroom classroom;

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<AttendanceRecord> attendanceRecords = new HashSet<>();

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Justification> justifications = new HashSet<>();
}
