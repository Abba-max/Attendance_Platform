package group3.en.stuattendance.Attendancemanager.DTO;

public class AttendanceRequestDTO {
    private Integer sessionId;
    private String pinCode;
    private String qrData;
    private String latitude;
    private String longitude;

    public AttendanceRequestDTO() {}

    public AttendanceRequestDTO(Integer sessionId, String pinCode, String qrData, String latitude, String longitude) {
        this.sessionId = sessionId;
        this.pinCode = pinCode;
        this.qrData = qrData;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public static AttendanceRequestDTOBuilder builder() {
        return new AttendanceRequestDTOBuilder();
    }

    // Getters and Setters
    public Integer getSessionId() { return sessionId; }
    public void setSessionId(Integer id) { this.sessionId = id; }

    public String getPinCode() { return pinCode; }
    public void setPinCode(String pinCode) { this.pinCode = pinCode; }

    public String getQrData() { return qrData; }
    public void setQrData(String qrData) { this.qrData = qrData; }

    public String getLatitude() { return latitude; }
    public void setLatitude(String latitude) { this.latitude = latitude; }

    public String getLongitude() { return longitude; }
    public void setLongitude(String longitude) { this.longitude = longitude; }

    public static class AttendanceRequestDTOBuilder {
        private Integer sessionId;
        private String pinCode;
        private String qrData;
        private String latitude;
        private String longitude;

        public AttendanceRequestDTOBuilder sessionId(Integer id) { this.sessionId = id; return this; }
        public AttendanceRequestDTOBuilder pinCode(String pinCode) { this.pinCode = pinCode; return this; }
        public AttendanceRequestDTOBuilder qrData(String qrData) { this.qrData = qrData; return this; }
        public AttendanceRequestDTOBuilder latitude(String latitude) { this.latitude = latitude; return this; }
        public AttendanceRequestDTOBuilder longitude(String longitude) { this.longitude = longitude; return this; }

        public AttendanceRequestDTO build() {
            return new AttendanceRequestDTO(sessionId, pinCode, qrData, latitude, longitude);
        }
    }
}
