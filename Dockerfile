# ==========================================
# Build Stage
# ==========================================
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy the pom.xml and source code
COPY pom.xml .
COPY src ./src

# Package the application (skip tests for faster deployment)
RUN mvn clean package -DskipTests

# ==========================================
# Run Stage
# ==========================================
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy the compiled JAR from the build stage and name it stuattendance.jar
COPY --from=build /app/target/*.jar stuattendance.jar

# Render exposes the PORT environment variable (default 8080 for standard setup)
ENV PORT=8080
EXPOSE 8080

# Set Server Port property explicitly to the injected PORT
ENV SERVER_PORT=${PORT}

# Run the application
ENTRYPOINT ["java", "-jar", "stuattendance.jar"]
