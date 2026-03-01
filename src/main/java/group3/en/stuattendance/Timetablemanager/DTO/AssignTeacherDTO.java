package group3.en.stuattendance.Timetablemanager.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignTeacherDTO {

    @NotNull(message = "L'ID du cours est obligatoire")
    private Integer courseId;

    @NotNull(message = "L'ID de l'enseignant est obligatoire")
    private Integer teacherId;
}