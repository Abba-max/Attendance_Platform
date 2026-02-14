package group3.en.stuattendance.Institutionmanager.Model;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "cycles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cycle_id")
    private Integer cycleId;

    @Column(nullable = false, unique = true, length = 100)
    private String name; // e.g., Bachelor, Master, Engineering

    @Column(length = 255)
    private String description;

    @OneToMany(mappedBy = "cycle", cascade = CascadeType.ALL)
    @Builder.Default
    private Set<Department> departments = new HashSet<>();

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Cycle cycle = (Cycle) o;
        return Objects.equals(cycleId, cycle.cycleId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(cycleId);
    }
}