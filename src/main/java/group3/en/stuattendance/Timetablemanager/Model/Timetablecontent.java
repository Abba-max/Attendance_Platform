package group3.en.stuattendance.Timetablemanager.Model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "timetable_contents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Timetablecontent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "timetable_id")
    private Integer timetableId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    @JsonIgnore
    private  Course courses;
//    private  List<Course> courses;


    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    @JsonIgnore
    private List<Session> sessions;

    @Column(length = 20)
    private String day;

    private Integer week;
}