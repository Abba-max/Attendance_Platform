package group3.en.stuattendance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;




@SpringBootApplication
// (exclude = {  //Temporarily exclude connection to the database for running the application
//        // Connection to the remote machine hosting the database will be done
//        DataSourceAutoConfiguration.class,
//        HibernateJpaAutoConfiguration.class,
//        DataSourceTransactionManagerAutoConfiguration.class
//})
@EnableJpaAuditing
public class StuattendanceApplication {

	public static void main(String[] args) {
		SpringApplication.run(StuattendanceApplication.class, args);
	}

}
