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

    @Column(name = "pedagog_id")
    private Integer pedagogId;

    @OneToOne(mappedBy = "pedagog")
    private Department department;
}
