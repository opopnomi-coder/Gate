package com.example.visitor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.Properties;
import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class VisitorManagementApplication {

	public static void main(String[] args) {
		// Set JVM timezone to IST — fixes all LocalDateTime.now() calls globally
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));

		SpringApplication app = new SpringApplication(VisitorManagementApplication.class);
		// Force ddl-auto=none — overrides any env var (SPRING_JPA_HIBERNATE_DDL_AUTO)
		Properties defaults = new Properties();
		defaults.setProperty("spring.jpa.hibernate.ddl-auto", "none");
		app.setDefaultProperties(defaults);
		app.run(args);
	}

}
