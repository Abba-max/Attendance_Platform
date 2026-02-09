package group3.en.stuattendance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class StuattendanceApplication {

	public static void main(String[] args) {
		SpringApplication.run(StuattendanceApplication.class, args);
	}

}
