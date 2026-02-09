package group3.en.stuattendance.Usermanager.Model;

import group3.en.stuattendance.Institutionmanager.Model.Department;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pedagogs")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@PrimaryKeyJoinColumn(name = "user_id")
public class Pedagog extends User {

    @OneToOne
    @JoinColumn(name = "department_id")
    private Department department;
}
