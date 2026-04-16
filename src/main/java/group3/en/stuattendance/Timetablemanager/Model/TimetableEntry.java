package group3.en.stuattendance.Timetablemanager.Model;

import group3.en.stuattendance.Usermanager.Model.User;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalTime;
import java.util.Objects;

@Entity
@Table(name = "timetable_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    private Integer entryId;

    @Column(length = 20, nullable = false)
    private String day; // MONDAY, TUESDAY, etc.

    /** Numeric day index 0=Monday … 5=Saturday — used by the frontend grid. */
    @Column(name = "day_of_week")
    private Integer dayOfWeek;

    /** Hex color chosen by the user for this block (e.g. #00B0FF). */
    @Column(length = 10)
    private String color;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @com.fasterxml.jackson.annotation.JsonProperty("isEvent")
    @Column(name = "is_event", nullable = false)
    @Builder.Default
    private Boolean isEvent = false;

    @Column(name = "event_name", length = 150)
    private String eventName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = true)
    @JsonIgnore
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    @JsonIgnore
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timetable_id")
    @JsonIgnore
    private Timetablecontent timetablecontent;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TimetableEntry that = (TimetableEntry) o;
        return Objects.equals(entryId, that.entryId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(entryId);
    }
}
