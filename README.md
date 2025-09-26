# 25-26-INGE 3 ISI EN-GROUP4-Attendance Management System

## Getting started: Project Inititialization on VsCode

1. Install Necessary VS code Extensions:
  . Extension Pack for Java
  . Spring Boot Extension Pack 
  . Maven for Java

2. Generate the Spring Boot Project
  . Open the Command Palette in VS Code
  . Type Spring Initializr and select Spring Initializr: Create a Maven Project
  . Select the following options: 
    - Language: Java
    - Spring Boot Version: 3.5..
    - ProjectMetadata: desired group (group3.en) and artifact (stuattendance)
    - Packaging: Jar
    - Java Version: 17 or 21
    - Dependencies: Spring Web, Thymeleaf and Spring Boot DevTools
  . Finalize: Select a folder on your computer to save the Project

3. Create the Thymeleaf View:
  . Create a new file named index.html inside the src/main/resources/templates folder.
  . Add a simple message on the body of the project to check for effective project Initialization.
    Example: <body> Student Attendance Management System Initialized using Spring Boot and Thymeleaf</body>

4. Create the Controller : 
  . Navigate to your main source folder 
  . Create a Java class: HomeController.Java

5. Running the Application:
  . Open the Spring Boot Dashboard view
  . Find your project listed and click the Play button (▶) 
  . Access to the app via the link:http://localhost:8080/