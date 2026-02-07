package group3.en.stuattendance.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "admins")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@PrimaryKeyJoinColumn(name = "user_id")
public class Admin extends User {

    @Column(name = "admin_id")
    private Integer adminId;

}