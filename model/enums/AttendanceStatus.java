package group3.en.stuattendance.model.enums;

public enum AttendanceStatus {
    PRESENT("Present"),
    ABSENT("Absent"),
    LATE("Late"),
    EXCUSED("Excused");

    private final String displayName;

    AttendanceStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

