package group3.en.stuattendance.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "teachers", indexes = {
        @Index(name = "idx_join_code", columnList = "join_code")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@PrimaryKeyJoinColumn(name = "user_id")
public class Teacher extends User {

    @Column(name = "teacher_id")
    private Integer teacherId;

    @Column(name = "join_code", unique = true, length = 20)
    private String joinCode;

    @OneToMany(mappedBy = "teacher", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Course> courses = new HashSet<>();

    @OneToMany(mappedBy = "teacher", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Session> sessions = new HashSet<>();
}