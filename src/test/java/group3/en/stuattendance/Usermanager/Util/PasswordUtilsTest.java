package group3.en.stuattendance.Usermanager.Util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PasswordUtilsTest {

    @Test
    void testGeneratePassword_ValidName() {
        String firstName = "John";
        String password = PasswordUtils.generatePassword(firstName);
        assertNotNull(password);
        assertEquals(firstName.length(), password.length());
        assertTrue(password.chars().anyMatch(Character::isDigit));
    }

    @Test
    void testGeneratePassword_NullName() {
        String password = PasswordUtils.generatePassword(null);
        assertEquals("Pass123!@", password);
    }

    @Test
    void testGeneratePassword_EmptyName() {
        String password = PasswordUtils.generatePassword("");
        assertEquals("Pass123!@", password);
    }
}
