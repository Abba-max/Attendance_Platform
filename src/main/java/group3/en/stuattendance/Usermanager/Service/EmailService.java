package group3.en.stuattendance.Usermanager.Service;


public interface EmailService {

    /**


     * @param to       Recipient email address.
     * @param username The new account's username.
     * @param password The new account's temporary password.
     */
    void sendAccountCredentialsEmail(String to, String username, String password);
}
