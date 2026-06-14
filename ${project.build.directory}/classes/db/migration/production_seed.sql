-- Production seed data for stu_attendance_db
-- Run this script in the production environment to prepopulate core infrastructure tables.

-- Ensure the academic_years status enum supports the new 'PLANNED' status
ALTER TABLE `academic_years` MODIFY COLUMN `status` ENUM('PLANNED', 'ACTIVE', 'SUSPENDED', 'CLOSED') NOT NULL;

INSERT IGNORE INTO `institutions` VALUES (1,'2026-02-15 08:31:14.881108','2026-06-13 18:06:08.081773','SJI','Eyang & Etokoss','[[3.8839505640656182,11.389421193879885],[3.885534721979386,11.390751600265505],[3.8844108443274323,11.392843793102204],[3.8824305977329545,11.390891069549866]]',_binary '\0');

INSERT IGNORE INTO `cycles` VALUES (1,'A three year programme.','Bachelor'),(3,'An Engineering curriculum on the Eyang campus.','Engineering'),(4,'School  Located at Symbock','Etokoss');

INSERT IGNORE INTO `departments` VALUES (3,1,'2026-02-19 17:06:55.959887','2026-03-20 16:45:13.306810','Marketting','Fadhil',1,NULL,13),(5,1,'2026-02-22 21:48:12.062527','2026-02-22 23:23:00.868646','Mobile Development','Marcel',1,NULL,NULL),(8,1,'2026-02-23 08:42:12.660628','2026-03-09 09:52:24.092425','SRT','Dr. Ossongo',3,NULL,NULL),(11,1,'2026-03-02 22:22:37.877657','2026-03-02 22:22:37.954856','ISI','Dr. Mopoujou',3,NULL,NULL);

INSERT IGNORE INTO `specialities` VALUES (1,'2026-02-24 21:47:54.575661','Telecom','TMSSR','2026-02-24 21:47:54.575661',8),(3,'2026-03-02 22:22:51.865817','','ISI','2026-03-02 22:22:51.865817',11),(4,'2026-03-02 23:37:07.666462','','MSI','2026-03-02 23:37:07.666462',11),(5,'2026-05-17 09:10:44.000000','Tronc Commun Cycle Ingénieur','Tronc Commun','2026-05-17 09:10:44.000000',11);

INSERT IGNORE INTO `classrooms` VALUES (20,10,NULL,5,'INGE 5 TMMSR',1),(22,11,NULL,3,'INGE 3 ISI EN',3),(10,12,NULL,5,'INGE 5 MSI',4),(70,13,NULL,3,'INGE 3 ISI FR',3),(100,14,NULL,4,'INGE 4 ISI EN',3),(50,15,NULL,3,'INGE 3 TC',5);
