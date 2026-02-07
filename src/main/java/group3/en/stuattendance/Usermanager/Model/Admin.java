package group3.en.stuattendance.Usermanager.Model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "admins")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@PrimaryKeyJoinColumn(name = "user_id")

public class Admin {
    @Column(name = "admin_id")
    private Integer Id;
}
