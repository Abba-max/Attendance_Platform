package group3.en.stuattendance.Usermanager.Service;


public interface EmailService {

    /**


     * @param to       Recipient email address.
     * @param username The new account's username.
     * @param password The new account's temporary password.
     */
    void sendAccountCredentialsEmail(String to, String username, String password);

    /**
     * Sends a timetable PDF to multiple recipients using BCC.
     *
     * @param fromEmail          Sender email address (overrides default if provided).
     * @param bccRecipients      List of recipient email addresses.
     * @param subject            Email subject.
     * @param messageText        Custom message text.
     * @param pdfAttachment      PDF file content as byte array.
     * @param attachmentFilename Name of the attached file.
     * @param senderName         Display name of the sender.
     */
    void sendTimetableEmail(String fromEmail, java.util.List<String> bccRecipients, String subject, String messageText, byte[] pdfAttachment, String attachmentFilename, String senderName);
}
