package group3.en.stuattendance.Usermanager.Model;

import group3.en.stuattendance.Institutionmanager.Model.Institution;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "supervisors")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@PrimaryKeyJoinColumn(name = "user_id")
public class Supervisor extends User {
}
