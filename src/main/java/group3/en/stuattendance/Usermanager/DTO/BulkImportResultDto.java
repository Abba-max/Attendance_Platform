package group3.en.stuattendance.Usermanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkImportResultDto {
    private int totalRows;
    private int successCount;
    private int failureCount;
    private List<RowError> errors = new ArrayList<>();

    @Data
    @AllArgsConstructor
    public static class RowError {
        private int rowNumber;
        private String identifier; // email or username
        private String errorMessage;
    }
}
