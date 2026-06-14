-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: stu_attendance_db
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `institutions`
--

LOCK TABLES `institutions` WRITE;
/*!40000 ALTER TABLE `institutions` DISABLE KEYS */;
INSERT  IGNORE INTO `institutions` (`institution_id`, `created_at`, `updated_at`, `name`, `location`, `geofence_data`, `geofencing_enabled`) VALUES (1,'2026-02-15 08:31:14.881108','2026-06-13 18:06:08.081773','SJI','Eyang & Etokoss','[[3.8839505640656182,11.389421193879885],[3.885534721979386,11.390751600265505],[3.8844108443274323,11.392843793102204],[3.8824305977329545,11.390891069549866]]',_binary '\0');
/*!40000 ALTER TABLE `institutions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT  IGNORE INTO `departments` (`department_id`, `institution_id`, `created_at`, `updated_at`, `name`, `chief`, `cycle_id`) VALUES (3,1,'2026-02-19 17:06:55.959887','2026-03-20 16:45:13.306810','Marketting','Fadhil',1),(5,1,'2026-02-22 21:48:12.062527','2026-02-22 23:23:00.868646','Mobile Development','Marcel',1),(8,1,'2026-02-23 08:42:12.660628','2026-03-09 09:52:24.092425','SRT','Dr. Ossongo',3),(11,1,'2026-03-02 22:22:37.877657','2026-03-02 22:22:37.954856','ISI','Dr. Mopoujou',3);
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `specialities`
--

LOCK TABLES `specialities` WRITE;
/*!40000 ALTER TABLE `specialities` DISABLE KEYS */;
INSERT  IGNORE INTO `specialities` (`speciality_id`, `created_at`, `description`, `name`, `updated_at`, `department_id`) VALUES (1,'2026-02-24 21:47:54.575661','Telecom','TMSSR','2026-02-24 21:47:54.575661',8),(3,'2026-03-02 22:22:51.865817','','ISI','2026-03-02 22:22:51.865817',11),(4,'2026-03-02 23:37:07.666462','','MSI','2026-03-02 23:37:07.666462',11),(5,'2026-05-17 09:10:44.000000','Tronc Commun Cycle Ingénieur','Tronc Commun','2026-05-17 09:10:44.000000',11);
/*!40000 ALTER TABLE `specialities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `classrooms`
--

LOCK TABLES `classrooms` WRITE;
/*!40000 ALTER TABLE `classrooms` DISABLE KEYS */;
INSERT  IGNORE INTO `classrooms` (`capacity`, `class_id`, `level`, `name`, `speciality_id`) VALUES (20,10,5,'INGE 5 TMMSR',1),(22,11,3,'INGE 3 ISI EN',3),(10,12,5,'INGE 5 MSI',4),(70,13,3,'INGE 3 ISI FR',3),(100,14,4,'INGE 4 ISI EN',3),(50,15,3,'INGE 3 TC',5);
/*!40000 ALTER TABLE `classrooms` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-14 13:29:58
