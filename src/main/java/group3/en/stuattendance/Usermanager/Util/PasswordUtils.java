package group3.en.stuattendance.Usermanager.Util;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class PasswordUtils {

    private static final SecureRandom random = new SecureRandom();

    /**
     * @param firstName The first name is the base for the password .
     * @return A permutated string with a random digit.
     */
    public static String generatePassword(String firstName) {
        if (firstName == null || firstName.isEmpty()) {
            return "Pass123!@";
        }

        firstName = firstName.toLowerCase();

        List<Character> chars = new ArrayList<>();
        for (char c : firstName.toCharArray()) {
            chars.add(c);
        }
        Collections.shuffle(chars, random);


        int randomIndex = random.nextInt(chars.size());
        char randomDigit = (char) ('0' + random.nextInt(10));
        chars.set(randomIndex, randomDigit);

        StringBuilder sb = new StringBuilder();
        for (char c : chars) {
            sb.append(c);
        }
        
        return sb.toString();
    }
}
