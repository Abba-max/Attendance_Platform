package group3.en.stuattendance.Usermanager.Util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PasswordUtilsTest {

    @Test
    void testGeneratePassword_Length() {
        String username = "jdoe";
        String password = PasswordUtils.generatePassword(username);
        
        // Password should have the same length as username
        assertEquals(username.length(), password.length());
    }

    @Test
    void testGeneratePassword_ContainsDigit() {
        String username = "jdoe";
        String password = PasswordUtils.generatePassword(username);
        
        // At least one character must be a digit
        boolean hasDigit = false;
        for (char c : password.toCharArray()) {
            if (Character.isDigit(c)) {
                hasDigit = true;
                break;
            }
        }
        assertTrue(hasDigit, "Password should contain at least one digit");
    }

    @Test
    void testGeneratePassword_Permutation() {
        String username = "jdoe";
        String password = PasswordUtils.generatePassword(username);
        
        // Password should not be equal to username (highly likely)
        // Note: For very short usernames, there's a small chance it shuffles back to same positions,
        // but with the digit substitution, it should definitely be different.
        assertNotEquals(username, password);
    }

    @Test
    void testGeneratePassword_Fallback() {
        // Test null/empty handling
        String pass1 = PasswordUtils.generatePassword(null);
        assertNotNull(pass1);
        
        String pass2 = PasswordUtils.generatePassword("");
        assertNotNull(pass2);
    }
}
