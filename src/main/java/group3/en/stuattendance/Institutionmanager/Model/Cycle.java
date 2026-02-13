package group3.en.stuattendance.Institutionmanager.Model;

import jakarta.persistence.*;

import java.util.List;

@Entity
public class Cycle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name; // e.g., "Engineering Cycle"

    @OneToMany(mappedBy = "cycle")
    private List<Department> departments;
}