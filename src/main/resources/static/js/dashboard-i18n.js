(function () {
    const STORAGE_KEY = 'app_lang';
    const supportedLanguages = ['en', 'fr'];
    const originalText = new WeakMap();
    const originalAttributes = new WeakMap();
    let applying = false;

    const text = {
        'Overview': 'Vue d ensemble',
        'Dashboard Overview': 'Vue d ensemble du tableau de bord',
        'System Insights': 'Indicateurs systeme',
        'Manage Institutions': 'Gérer les institutions',
        'Academic Year': 'Année académique',
        'Manage Users': 'Gérer les utilisateurs',
        'Roles & Permissions': 'Rôles et permissions',
        'Audit Logs': 'Journal d’audit',
        'Manage Hierarchy': 'Gérer la hiérarchie',
        'Academic Year Scheduling': 'Planification de l annee academique',
        'Active Schedules': 'Planifications actives',
        'Manage Courses': 'Gérer les cours',
        'Manage Students': 'Gérer les étudiants',
        'Justifications': 'Justificatifs',
        'Manage Timetable': 'Gérer l’emploi du temps',
        'Manage Sessions': 'Gérer les sessions',
        'Manage Attendance': 'Gérer la présence',
        'Weekly Planning': 'Planning hebdomadaire',
        'Student Migration': 'Migration des etudiants',
        'Export Reports': 'Exporter les rapports',
        'Student Management': 'Gestion des etudiants',
        'Specialities & Classrooms': 'Specialites et salles de classe',
        'Course Management': 'Gestion des cours',
        'Session Monitor': 'Suivi des sessions',
        'Global Roll Call': 'Appel global',
        'Justification Review': 'Revision des justificatifs',
        'Export Attendance Reports': 'Exporter les rapports de presence',
        'Daily Attendance': 'Présence quotidienne',
        'Weekly Absences': 'Absences hebdomadaires',
        'Semester Summary': 'Resume semestriel',
        'Register Individual Student': 'Inscrire un etudiant',
        'Schedule': 'Planning',
        'Roll Call': 'Appel',
        'Roll Call Hub': 'Centre d appel',
        'My Students': 'Mes etudiants',
        'Attendance': 'Présence',
        'Academic Timetable': 'Emploi du temps academique',
        'Statistics': 'Statistiques',
        'Check-In': 'Pointage',
        'Absences': 'Absences',
        'Courses': 'Cours',
        'Reports': 'Rapports',
        'Settings': 'Paramètres',
        'Active Schedule': 'Planning actif',
        'History & Absences': 'Historique et absences',
        'No active classes': 'Aucun cours actif',
        'Start Scan': 'Lancer le scan',
        'Submit Justification': 'Soumettre un justificatif',
        'Active Token': 'Jeton actif',
        'Session Finalized!': 'Session finalisee !',
        'Active Session': 'Session active',
        'Central Institution': 'Institution centrale',
        'Pedagogic Department': 'Département pédagogique',
        'Teacher Dashboard': 'Tableau de bord enseignant',
        'Student Dashboard': 'Tableau de bord etudiant',
        'Administrator': 'Administrateur',
        'Pedagogic Assistant': 'Assistant pedagogique',
        'Teacher': 'Enseignant',
        'Student': 'Étudiant',
        'Supervisor': 'Superviseur',
        'Dashboard User': 'Utilisateur du tableau de bord',
        'Account': 'Compte',
        'My Profile': 'Mon profil',
        'Change Password': 'Changer le mot de passe',
        'Logout': 'Déconnexion',
        'Notifications': 'Notifications',
        'Mark all read': 'Tout marquer comme lu',
        'Mark all as read': 'Tout marquer comme lu',
        'No new notifications': 'Aucune nouvelle notification',
        'Account Details': 'Details du compte',
        'Full name / username': 'Nom complet / identifiant',
        'Email': 'Email',
        'Email Address': 'Adresse email',
        'Role': 'Role',
        'Account status': 'Statut du compte',
        'Active': 'Actif',
        'Photo upload': 'Photo de profil',
        'Preview only. No backend upload is changed here.': 'Aperçu uniquement. Aucun envoi serveur n’est modifié ici.',
        'Change Photo': 'Changer la photo',
        'Save Changes': 'Enregistrer',
        'Cancel': 'Annuler',
        'Done': 'Termine',
        'Theme': 'Theme',
        'Use the moon/sun control in the top bar.': 'Utilisez le bouton lune/soleil dans la barre superieure.',
        'Language': 'Langue',
        'English': 'Anglais',
        'French': 'Francais',
        'Enabled': 'Active',
        'Email notifications': 'Notifications par email',
        'Dashboard activity summaries': 'Resumes d activite du tableau de bord',
        'Current password': 'Mot de passe actuel',
        'Current Password': 'Mot de passe actuel',
        'New password': 'Nouveau mot de passe',
        'New Password': 'Nouveau mot de passe',
        'Confirm password': 'Confirmer le mot de passe',
        'Confirm Password': 'Confirmer le mot de passe',
        'Update Password': 'Mettre a jour le mot de passe',
        'All fields are required.': 'Tous les champs sont obligatoires.',
        'New passwords do not match.': 'Les nouveaux mots de passe ne correspondent pas.',
        'Password must be at least 6 characters.': 'Le mot de passe doit contenir au moins 6 caracteres.',
        'Password updated successfully.': 'Mot de passe mis a jour avec succes.',
        'Update failed. Check your current password.': 'La mise a jour a echoue. Verifiez votre mot de passe actuel.',
        'Profile changes are previewed in the UI. Photo upload is not persisted by this shared modal.': 'Les changements du profil sont previsualises dans l interface. La photo n est pas enregistree par ce modal partage.',
        'First Name': 'Prenom',
        'Last Name': 'Nom',
        'Username / Email': 'Identifiant / email',
        'Username': 'Identifiant',
        'Password': 'Mot de passe',
        'Assigned Role': 'Role assigne',
        'Role Name': 'Nom du role',
        'Description': 'Description',
        'Academic Year Name': 'Nom de l annee academique',
        'Start Date': 'Date de debut',
        'End Date': 'Date de fin',
        'Institution Name': 'Nom de l institution',
        'Location': 'Localisation',
        'Cycle Name': 'Nom du cycle',
        'Department Name': 'Nom du departement',
        'Department Chief': 'Chef de departement',
        'Pedagogic Assistants': 'Assistants pedagogiques',
        'Supervisors': 'Superviseurs',
        'Cycle': 'Cycle',
        'Institution': 'Institution',
        'Speciality': 'Spécialité',
        'Specialities': 'Specialites',
        'Classroom': 'Salle de classe',
        'Class': 'Classe',
        'Level': 'Niveau',
        'Semester': 'Semestre',
        'Version': 'Version',
        'Start': 'Debut',
        'End': 'Fin',
        'Status': 'Statut',
        'Actions': 'Actions',
        'Action': 'Action',
        'Target': 'Cible',
        'Timestamp': 'Horodatage',
        'User & Role': 'Utilisateur et role',
        'Category & Severity': 'Categorie et gravite',
        'Category': 'Categorie',
        'Severity': 'Gravite',
        'Student': 'Étudiant',
        'Matricule': 'Matricule',
        'Attended': 'Present',
        'Hourly Marking': 'Marquage horaire',
        'Record': 'Enregistrement',
        'Subject': 'Matiere',
        'Attendance Yield': 'Taux de presence',
        'Student Identifier': 'Identifiant etudiant',
        'Course / Event': 'Cours / evenement',
        'Date & Time': 'Date et heure',
        'User Management': 'Gestion des utilisateurs',
        'Institution Management': 'Gestion des institutions',
        'Session Management': 'Gestion des sessions',
        'Justification Management': 'Gestion des justificatifs',
        'Security': 'Securite',
        'Info': 'Info',
        'Warning': 'Avertissement',
        'Error': 'Erreur',
        'All Categories': 'Toutes les categories',
        'All Severities': 'Toutes les gravites',
        'All Specialities': 'Toutes les specialites',
        'All Classrooms': 'Toutes les salles',
        'All Classes': 'Toutes les classes',
        'All Subjects': 'Toutes les matieres',
        'All Attendance': 'Toutes les presences',
        'All Levels': 'Tous les niveaux',
        'All Credits': 'Tous les credits',
        'All Statuses': 'Tous les statuts',
        'All Justifications': 'Tous les justificatifs',
        'All Thresholds': 'Tous les seuils',
        'All Rooms': 'Toutes les salles',
        'All': 'Tous',
        'Present': 'Present',
        'Absent': 'Absent',
        'Late': 'Retard',
        'Excused': 'Excuse',
        'Pending': 'En attente',
        'Approved': 'Approuve',
        'Rejected': 'Rejete',
        'Needs Justification': 'Justification requise',
        'Scheduled': 'Planifie',
        'In Progress': 'En cours',
        'Completed': 'Termine',
        'Cancelled': 'Annule',
        'Critical (<75%)': 'Critique (<75 %)',
        'Warning (75-85%)': 'Avertissement (75-85 %)',
        'Good (>85%)': 'Bon (>85 %)',
        'Always Present (100%)': 'Toujours present (100 %)',
        'Good (>= 80%)': 'Bon (>= 80 %)',
        'Good (≥ 80%)': 'Bon (>= 80 %)',
        'Average (60-79%)': 'Moyen (60-79 %)',
        'Average (60–79%)': 'Moyen (60-79 %)',
        'Poor (< 60%)': 'Faible (< 60 %)',
        'Sort by Name (A-Z)': 'Trier par nom (A-Z)',
        'Sort by Lowest Yield': 'Trier par taux le plus bas',
        'Sort by Highest Yield': 'Trier par taux le plus eleve',
        'Sort: Name A->Z': 'Tri : nom A-Z',
        'Sort: Name A→Z': 'Tri : nom A-Z',
        'Sort: Name Z->A': 'Tri : nom Z-A',
        'Sort: Name Z→A': 'Tri : nom Z-A',
        'Current Week': 'Semaine actuelle',
        'Latest Active': 'Derniere active',
        'Auto (Active Year)': 'Auto (annee active)',
        'Select Spec': 'Choisir une specialite',
        'Select Room': 'Choisir une salle',
        'Select Speciality': 'Choisir une specialite',
        'Select Speciality...': 'Choisir une specialite...',
        'Select Classroom': 'Choisir une salle',
        'Select Classroom...': 'Choisir une salle...',
        'Select Class...': 'Choisir une classe...',
        'Select Week...': 'Choisir une semaine...',
        'Select a Session': 'Choisir une session',
        'Select Session': 'Choisir une session',
        'Select a Course Context...': 'Choisir un contexte de cours...',
        'Please select a classroom first': 'Veuillez d abord choisir une salle',
        'All Missed Hours': 'Toutes les heures manquees',
        'Absence Session': 'Session d absence',
        'Target Hour Slot': 'Creneau horaire cible',
        'Reason': 'Motif',
        'Attachment': 'Piece jointe',
        'Load Roster': 'Charger la liste',
        'Export': 'Exporter',
        'Save': 'Enregistrer',
        'Save Timetable': 'Enregistrer l emploi du temps',
        'All Present': 'Tous presents',
        'All Absent': 'Tous absents',
        'Review': 'A verifier',
        'Refresh': 'Actualiser',
        'Preview Report': 'Aperçu du rapport',
        'Export as PDF': 'Exporter en PDF',
        'Email Timetable to Students': 'Envoyer l emploi du temps aux etudiants',
        'View Details': 'Voir les details',
        'Regenerate PIN': 'Regenerer le PIN',
        'Show QR': 'Afficher le QR',
        'Submit': 'Soumettre',
        'Submit Attendance': 'Soumettre la presence',
        'Register New Staff Member': 'Enregistrer un membre du personnel',
        'Create New Role': 'Creer un nouveau role',
        'Manage Permissions': 'Gérer les permissions',
        'Launch Academic Year': 'Lancer l annee academique',
        'Edit Institution': 'Modifier l institution',
        'Create New Cycle': 'Creer un nouveau cycle',
        'Edit Cycle': 'Modifier le cycle',
        'Create New Department': 'Creer un nouveau departement',
        'Edit Department': 'Modifier le departement',
        'Add Scoped Schedule': 'Ajouter une planification ciblee',
        'Set as current active': 'Definir comme actif',
        'Global (Institution-wide)': 'Global (institution entiere)',
        'Specific Cycle(s)': 'Cycle(s) specifique(s)',
        'Relational: Departments by Cycle': 'Relationnel : departements par cycle',
        'Relational: Specialities by Department': 'Relationnel : specialites par departement',
        'Relational: Classrooms by Speciality': 'Relationnel : salles par specialite',
        'Choose a Cycle': 'Choisir un cycle',
        '-- Choose a Cycle --': '-- Choisir un cycle --',
        '-- Choose a Department --': '-- Choisir un departement --',
        '-- Choose a Speciality --': '-- Choisir une specialite --',
        'No institutions found': 'Aucune institution trouvee',
        'Functional overview for': 'Vue fonctionnelle pour',
        'Course': 'Cours',
        'Classroom roster': 'Liste de classe',
        'Library': 'Bibliotheque',
        'Mon': 'Lun',
        'Tue': 'Mar',
        'Wed': 'Mer',
        'Thu': 'Jeu',
        'Fri': 'Ven',
        'Sat': 'Sam',
        'View': 'Voir',
        'New password reset request': 'Nouvelle demande de reinitialisation',
        'A staff member requested password assistance.': 'Un membre du personnel a demande une aide pour son mot de passe.',
        'Academic year status updated': 'Statut de l annee academique mis a jour',
        'The active session context is ready.': 'Le contexte de session active est pret.',
        'Institution data synced': 'Donnees institutionnelles synchronisees',
        'Dashboard data was refreshed successfully.': 'Les donnees du tableau de bord ont ete actualisees.',
        'Student migration ready': 'Migration des etudiants prete',
        'Eligible source and destination classes are available.': 'Les classes source et destination eligibles sont disponibles.',
        'Weekly planning updated': 'Planning hebdomadaire mis a jour',
        'A timetable change was published for review.': 'Une modification d emploi du temps a ete publiee pour revision.',
        'Attendance review pending': 'Revision des presences en attente',
        'New attendance records need validation.': 'De nouveaux enregistrements de presence doivent etre valides.',
        'Upcoming session': 'Session a venir',
        'You have a class scheduled soon.': 'Vous avez un cours programme bientot.',
        'Attendance draft saved': 'Brouillon de presence enregistre',
        'Recent roll call data is available.': 'Les donnees recentes d appel sont disponibles.',
        'Student list refreshed': 'Liste des etudiants actualisee',
        'Your classroom roster has been updated.': 'Votre liste de classe a ete mise a jour.',
        'Attendance status updated': 'Statut de presence mis a jour',
        'Your latest attendance record was processed.': 'Votre dernier enregistrement de presence a ete traite.',
        'Upcoming class reminder': 'Rappel de cours a venir',
        "Check today's academic schedule.": 'Consultez le planning academique du jour.',
        'Justification review': 'Revision du justificatif',
        'Recent absence requests are visible in your dashboard.': 'Les demandes d absence recentes sont visibles dans votre tableau de bord.',
        'Department review ready': 'Revision du departement prete',
        'A supervised department summary is available.': 'Un resume du departement supervise est disponible.',
        'Attendance anomaly flagged': 'Anomalie de presence signalee',
        'A class needs supervisory review.': 'Une classe necessite une revision de supervision.',
        'Staff assignment updated': 'Affectation du personnel mise a jour',
        'A department staffing change was synced.': 'Un changement d affectation du departement a ete synchronise.',
        'Just now': 'A l instant',
        'Today': 'Aujourd hui'
    };

    Object.assign(text, {
        'Overview': 'Vue d’ensemble',
        'Dashboard Overview': 'Vue d’ensemble',
        'System Insights': 'Indicateurs système',
        'Welcome back': 'Bon retour',
        'Welcome back!': 'Bon retour !',
        "Welcome back! Here's what's happening with your system today.": 'Bon retour ! Voici l’activité de votre système aujourd’hui.',
        'Here’s what’s happening with your system today': 'Voici l’activité de votre système aujourd’hui',
        "Here's what's happening with your system today": 'Voici l’activité de votre système aujourd’hui',
        'Welcome,': 'Bienvenue,',
        'Total Users': 'Utilisateurs totaux',
        'Active Sessions': 'Sessions actives',
        'Active Sessions Today': 'Sessions actives aujourd’hui',
        'Departments': 'Départements',
        'Active Staff': 'Personnel actif',
        'Students': 'Étudiants',
        'Admins': 'Admins',
        'Total Structures': 'Structures totales',
        'Stable': 'Stable',
        'Active': 'Actif',
        'Critical': 'Critique',
        'Academic Services': 'Services académiques',
        'Total Students': 'Étudiants totaux',
        'Total Teachers': 'Enseignants totaux',
        'Active Courses': 'Cours actifs',
        'Specialties': 'Spécialités',
        'Specialities': 'Spécialités',
        'Attendance Rate': 'Taux de présence',
        'Current Class': 'Cours en cours',
        'No active classes': 'Aucun cours actif',
        'Upcoming Session': 'Session à venir',
        'No upcoming classes scheduled.': 'Aucun cours à venir planifié.',
        'No classes scheduled for today.': 'Aucun cours prévu aujourd’hui.',
        'Check-in Now': 'Pointer maintenant',
        'Classes Today': 'Cours aujourd’hui',
        "Today's Covered": 'Cours assurés aujourd’hui',
        'Overall Hours': 'Heures totales',
        'Central Institution': 'Institution centrale',
        'Active Session': 'Session active',
        'Pedagogic Department': 'Département pédagogique',
        'Teacher Dashboard': 'Tableau de bord enseignant',
        'Student Dashboard': 'Tableau de bord étudiant',
        'Pedagogic Assistant': 'Assistant pédagogique',
        'Student': 'Étudiant',
        'Settings': 'Paramètres',
        'Logout': 'Déconnexion',
        'My Profile': 'Mon profil',
        'Save Changes': 'Enregistrer les modifications',
        'Update Password': 'Mettre à jour le mot de passe',
        'Account Details': 'Détails du compte',
        'Account status': 'Statut du compte',
        'Role': 'Rôle',
        'Photo upload': 'Photo de profil',
        'Preview only. No backend upload is changed here.': 'Aperçu uniquement. Aucun envoi serveur n’est modifié ici.',
        'Password updated successfully.': 'Mot de passe mis à jour avec succès.',
        'Update failed. Check your current password.': 'La mise à jour a échoué. Vérifiez votre mot de passe actuel.',
        'Profile changes are previewed in the UI. Photo upload is not persisted by this shared modal.': 'Les changements du profil sont prévisualisés dans l’interface. La photo n’est pas enregistrée par ce modal partagé.',
        'First Name': 'Prénom',
        'Academic Year': 'Année académique',
        'Academic Year Name': 'Nom de l’année académique',
        'Academic Year Scheduling': 'Planification de l’année académique',
        'Start Date': 'Date de début',
        'Department Name': 'Nom du département',
        'Department Chief': 'Chef de département',
        'Speciality': 'Spécialité',
        'All Specialities': 'Toutes les spécialités',
        'Select Speciality': 'Choisir une spécialité',
        'Select Speciality...': 'Choisir une spécialité...',
        'Select Spec': 'Choisir une spécialité',
        'Email Timetable to Students': 'Envoyer l’emploi du temps aux étudiants',
        'Launch Academic Year': 'Lancer l’année académique',
        'Edit Institution': 'Modifier l’institution',
        'Create New Department': 'Créer un nouveau département',
        'Edit Department': 'Modifier le département',
        'Relational: Departments by Cycle': 'Relationnel : départements par cycle',
        'Relational: Specialities by Department': 'Relationnel : spécialités par département',
        'Relational: Classrooms by Speciality': 'Relationnel : salles par spécialité',
        '-- Choose a Department --': '-- Choisir un département --',
        '-- Choose a Speciality --': '-- Choisir une spécialité --',
        'No institutions found': 'Aucune institution trouvée',
        'Please select a classroom first': 'Veuillez d’abord choisir une salle',
        'Loading date...': 'Chargement de la date...',
        'Classroom:': 'Salle :',
        'Upcoming session': 'Session à venir',
        'Just now': 'À l’instant',
        'Today': 'Aujourd’hui',
        'Institution data synced': 'Données institutionnelles synchronisées',
        'Dashboard data was refreshed successfully.': 'Les données du tableau de bord ont été actualisées.',
        'Student migration ready': 'Migration des étudiants prête',
        'Eligible source and destination classes are available.': 'Les classes source et destination éligibles sont disponibles.',
        'Weekly planning updated': 'Planning hebdomadaire mis à jour',
        'A timetable change was published for review.': 'Une modification d’emploi du temps a été publiée pour révision.',
        'Attendance review pending': 'Révision des présences en attente',
        'New attendance records need validation.': 'De nouveaux enregistrements de présence doivent être validés.',
        'You have a class scheduled soon.': 'Vous avez bientôt un cours programmé.',
        'Attendance draft saved': 'Brouillon de présence enregistré',
        'Recent roll call data is available.': 'Les données récentes d’appel sont disponibles.',
        'Student list refreshed': 'Liste des étudiants actualisée',
        'Attendance status updated': 'Statut de présence mis à jour',
        'Your latest attendance record was processed.': 'Votre dernier enregistrement de présence a été traité.',
        'Upcoming class reminder': 'Rappel de cours à venir',
        "Check today's academic schedule.": 'Consultez le planning académique du jour.',
        'A supervised department summary is available.': 'Un résumé du département supervisé est disponible.',
        'Attendance anomaly flagged': 'Anomalie de présence signalée',
        'A class needs supervisory review.': 'Une classe nécessite une révision de supervision.',
        'Staff assignment updated': 'Affectation du personnel mise à jour',
        'A department staffing change was synced.': 'Un changement d’affectation du département a été synchronisé.'
    });

    Object.assign(text, {
        'Close menu': 'Fermer le menu',
        'Toggle dark mode': 'Changer le thème',
        'Language selector': 'Sélecteur de langue',
        'Install App': 'Installer l’application',
        'Install': 'Installer',
        'Close': 'Fermer',
        'Edit': 'Modifier',
        'Edit Settings': 'Modifier les paramètres',
        'Delete': 'Supprimer',
        'Activate': 'Activer',
        'Suspend': 'Suspendre',
        'Retry': 'Réessayer',
        'Processing...': 'Traitement...',
        'Confirm & Save': 'Confirmer et enregistrer',
        'Export CSV': 'Exporter CSV',
        'Download PDF': 'Télécharger le PDF',
        'Download Excel': 'Télécharger Excel',
        'Export Attendance PDF': 'Exporter la présence en PDF',
        'Save Attendance': 'Enregistrer la présence',
        'Edit Profile': 'Modifier le profil',
        'Push Notifications': 'Notifications push',
        'Select Date': 'Choisir une date',
        'Refreshes in 30s': 'Actualisation dans 30 s',
        'Validate Presence': 'Valider la présence',
        'Attendance recorded!': 'Présence enregistrée !',
        'Check-In Failed': 'Échec du pointage',
        'No Active Session': 'Aucune session active',
        'Session Complete': 'Session terminée',
        'Session Missed': 'Session manquée',
        'Success': 'Succès',
        'Error': 'Erreur',
        'Safe Zone': 'Zone sûre',
        'Warning': 'Avertissement',
        'Unknown Course': 'Cours inconnu',
        'Live Now': 'En direct',
        'Hour': 'Heure',
        'Select a course to view its attendance yields.': 'Choisissez un cours pour afficher ses taux de présence.',
        'No students found.': 'Aucun étudiant trouvé.',
        'No students match your filters.': 'Aucun étudiant ne correspond à vos filtres.',
        'No courses match the filters.': 'Aucun cours ne correspond aux filtres.',
        'No history records match the filters.': 'Aucun historique ne correspond aux filtres.',
        'Failed to load history.': 'Échec du chargement de l’historique.',
        'Failed to load courses:': 'Échec du chargement des cours :',
        'Sync Error:': 'Erreur de synchronisation :',
        'No matching logs found': 'Aucun journal correspondant',
        'Failed to synchronize audit logs.': 'Échec de la synchronisation des journaux d’audit.',
        'No permissions found': 'Aucune permission trouvée',
        'No academic years found. Launch one to get started.': 'Aucune année académique trouvée. Lancez-en une pour commencer.',
        'Error loading academic years': 'Erreur lors du chargement des années académiques',
        'No scoped schedules yet': 'Aucune planification ciblée pour le moment',
        'Failed to load schedules.': 'Échec du chargement des planifications.',
        'Loading users...': 'Chargement des utilisateurs...',
        'Loading roles and permissions...': 'Chargement des rôles et permissions...',
        'Loading schedules...': 'Chargement des planifications...',
        'No valid rows found to preview. Please check for errors below.': 'Aucune ligne valide à prévisualiser. Vérifiez les erreurs ci-dessous.',
        'Choose CSV file': 'Choisir un fichier CSV',
        'Select PAs...': 'Choisir des AP...',
        'Select Supervisors...': 'Choisir des superviseurs...',
        'Selected': 'Sélectionné(s)',
        'Academic Year and dates are required.': 'L’année académique et les dates sont obligatoires.',
        'Start date must be before end date.': 'La date de début doit précéder la date de fin.',
        'Please select at least one cycle.': 'Veuillez choisir au moins un cycle.',
        'Please select at least one department.': 'Veuillez choisir au moins un département.',
        'Please select at least one speciality.': 'Veuillez choisir au moins une spécialité.',
        'Please select at least one classroom.': 'Veuillez choisir au moins une salle.',
        'Schedule configured successfully': 'Planification configurée avec succès',
        'Search cycles, departments, classrooms...': 'Rechercher cycles, départements, salles...',
        'Search users...': 'Rechercher des utilisateurs...',
        'Search by user, action, target...': 'Rechercher par utilisateur, action, cible...',
        'Search name, email, matricule...': 'Rechercher par nom, email, matricule...',
        'Search name or code...': 'Rechercher par nom ou code...',
        'Search name or matricule...': 'Rechercher par nom ou matricule...',
        'Search students by name...': 'Rechercher des étudiants par nom...',
        'Search courses...': 'Rechercher des cours...',
        'Search assistants...': 'Rechercher des assistants...',
        'Search supervisors...': 'Rechercher des superviseurs...',
        'Explain briefly why you were absent...': 'Expliquez brièvement votre absence...',
        'First name': 'Prénom',
        'Last name': 'Nom',
        'e.g. John': 'ex. John',
        'e.g. Smith': 'ex. Smith',
        'e.g. john.smith@institution.com': 'ex. john.smith@institution.com',
        'e.g. LAB_MANAGER': 'ex. LAB_MANAGER',
        'e.g., 2025-2026': 'ex. 2025-2026',
        'e.g., 2024/2025': 'ex. 2024/2025',
        'e.g., Bachelor, Master, Engineering': 'ex. Licence, Master, Ingénierie',
        'e.g., Computer Science': 'ex. Informatique',
        'Describe the responsibilities of this role...': 'Décrivez les responsabilités de ce rôle...',
        'Brief description of this cycle': 'Brève description de ce cycle',
        'Name of department chief': 'Nom du chef de département',
        'Name (e.g. USER_READ)': 'Nom (ex. USER_READ)',
        'All Cycles': 'Tous les cycles',
        'All Depts': 'Tous les départements',
        'All Specs': 'Toutes les spécialités',
        'Classrooms': 'Salles de classe',
        'Cycles': 'Cycles',
        'Departments Managed': 'Départements gérés',
        'No Departments Managed.': 'Aucun département géré.',
        'No Speciality': 'Aucune spécialité',
        'Permission added': 'Permission ajoutée',
        'Permission deleted': 'Permission supprimée',
        'Role created successfully': 'Rôle créé avec succès',
        'Role deleted successfully': 'Rôle supprimé avec succès',
        'Staff member created! Credentials sent via email.': 'Membre du personnel créé ! Identifiants envoyés par email.',
        'Profile picture updated successfully': 'Photo de profil mise à jour avec succès',
        'Profile updated successfully!': 'Profil mis à jour avec succès !',
        'Update failed. Please try again.': 'La mise à jour a échoué. Veuillez réessayer.',
        'Academic year launched successfully!': 'Année académique lancée avec succès !',
        'Academic year activated': 'Année académique activée',
        'Academic year deleted': 'Année académique supprimée',
        'Failed to delete speciality.': 'Échec de la suppression de la spécialité.',
        'Failed to delete cycle.': 'Échec de la suppression du cycle.',
        'Failed to delete department.': 'Échec de la suppression du département.',
        'Failed to delete classroom.': 'Échec de la suppression de la salle.',
        'Geofence perimeter saved successfully!': 'Périmètre de géolocalisation enregistré avec succès !',
        'Failed to save geofence.': 'Échec de l’enregistrement du périmètre.',
        'Justification successfully sent for review.': 'Justificatif envoyé pour validation.',
        'This session was scheduled but did not take place. No attendance can be recorded.': 'Cette session était planifiée mais n’a pas eu lieu. Aucune présence ne peut être enregistrée.',
        'There are no active classes available for check-in right now.': 'Aucun cours actif n’est disponible pour le pointage actuellement.',
        'Code invalide. Veuillez réessayer.': 'Code invalide. Veuillez réessayer.',
        'Verification...': 'Vérification...',
        'Vérification...': 'Vérification...',
        'QR Scanné — Valider': 'QR scanné — Valider'
    });

    Object.assign(text, {
        'Management': 'Gestion',
        'Overview': 'Vue d’ensemble',
        'Dashboard Overview': 'Vue d’ensemble',
        'System Insights': 'Indicateurs système',
        'Welcome back': 'Bon retour',
        'Welcome back!': 'Bon retour !',
        "Welcome back! Here's what's happening with your system today.": 'Bon retour ! Voici l’activité de votre système aujourd’hui.',
        "Here's what's happening with your system today": 'Voici l’activité de votre système aujourd’hui',
        'Here’s what’s happening with your system today': 'Voici l’activité de votre système aujourd’hui',
        'Active Session': 'Session active',
        'Central Institution': 'Institution centrale',
        'Pedagogic Department': 'Département pédagogique',
        'Teacher Dashboard': 'Tableau de bord enseignant',
        'Student Dashboard': 'Tableau de bord étudiant',
        'Pedagogic Assistant': 'Assistant pédagogique',
        'Academic Year': 'Année académique',
        'Academic Year Scheduling': 'Planification de l’année académique',
        'Manage Institutions': 'Gérer les institutions',
        'Manage Users': 'Gérer les utilisateurs',
        'Manage Hierarchy': 'Gérer la hiérarchie',
        'Manage Courses': 'Gérer les cours',
        'Manage Students': 'Gérer les étudiants',
        'Manage Timetable': 'Gérer l’emploi du temps',
        'Manage Sessions': 'Gérer les sessions',
        'Manage Attendance': 'Gérer la présence',
        'Manage Geofence': 'Gérer le périmètre',
        'Roles & Permissions': 'Rôles et permissions',
        'Audit Logs': 'Journal d’audit',
        'Settings': 'Paramètres',
        'Logout': 'Déconnexion',
        'My Profile': 'Mon profil',
        'Change Password': 'Changer le mot de passe',
        'Save Changes': 'Enregistrer les modifications',
        'Cancel': 'Annuler',
        'Update Password': 'Mettre à jour le mot de passe',
        'Department performance and student metrics': 'Performances du département et indicateurs étudiants',
        'Department performance and student metrics.': 'Performances du département et indicateurs étudiants.',
        'Define and assign courses to specialities': 'Définir et attribuer les cours aux spécialités',
        'Register and assign students to classrooms': 'Enregistrer et affecter les étudiants aux classes',
        'Approve or reject student absence justifications': 'Approuver ou rejeter les justificatifs d’absence des étudiants',
        'Drag courses & teachers onto the grid': 'Glisser les cours et enseignants dans la grille',
        'No students found': 'Aucun étudiant trouvé',
        'No students found.': 'Aucun étudiant trouvé.',
        'No Students Found': 'Aucun étudiant trouvé',
        'No courses defined in this department yet': 'Aucun cours défini dans ce département pour le moment',
        'All caught up': 'Tout est à jour',
        'All caught up.': 'Tout est à jour.',
        'No reason provided': 'Aucun motif fourni',
        '— Select a source classroom first —': '— Sélectionner d’abord une classe source —',
        'No next-level classrooms found in this speciality': 'Aucune classe de niveau supérieur trouvée dans cette spécialité',
        'Select destination classroom...': 'Sélectionner une classe de destination...',
        'Select a live session from your schedule to take attendance.': 'Sélectionner une session en cours dans votre planning pour faire l’appel.',
        'View Schedule': 'Voir le planning',
        'Save Attendance': 'Enregistrer la présence',
        'All Present': 'Tous présents',
        'All Absent': 'Tous absents',
        'Select Date': 'Sélectionner une date',
        'View and manage all students across your classes.': 'Consulter et gérer les étudiants de vos classes.',
        'Manage your account and preferences.': 'Gérer votre compte et vos préférences.',
        'Select a Course Context...': 'Sélectionner un contexte de cours...',
        'Select a course to view its attendance yields.': 'Sélectionner un cours pour afficher ses taux de présence.',
        'Active Token': 'Jeton actif',
        'Refreshes in 30s': 'Actualisation dans 30 s',
        'Export Attendance PDF': 'Exporter la présence en PDF',
        'Select your preferred check-in method.': 'Sélectionner votre méthode de pointage.',
        'Enter PIN': 'Saisir le PIN',
        'Select a method above to begin.': 'Sélectionner une méthode ci-dessus pour commencer.',
        'Enter the 4-digit PIN': 'Saisir le PIN à 4 chiffres',
        'All Missed Hours': 'Toutes les heures manquées',
        'Select a specific hour to justify or leave as "All Missed Hours"': 'Sélectionner une heure précise à justifier ou laisser "Toutes les heures manquées".',
        'View past sessions and submit justifications for absences.': 'Consulter les sessions passées et soumettre des justificatifs d’absence.',
        'Safe Zone': 'Zone sûre',
        'Warning': 'Avertissement',
        'Critical': 'Critique',
        'Unknown Course': 'Cours inconnu',
        'Live Now': 'En direct',
        'Validate Presence': 'Valider la présence',
        'Attendance recorded!': 'Présence enregistrée !',
        'No Active Session': 'Aucune session active',
        'Check-In Failed': 'Échec du pointage',
        'Session Complete': 'Session terminée',
        'Session Missed': 'Session manquée',
        'Success': 'Succès',
        'Justification successfully sent for review.': 'Justificatif envoyé pour validation.',
        'No history records match the filters.': 'Aucun historique ne correspond aux filtres.',
        'No courses match the filters.': 'Aucun cours ne correspond aux filtres.',
        'No students match your filters.': 'Aucun étudiant ne correspond à vos filtres.',
        'No matching logs found': 'Aucun journal correspondant',
        'No permissions found': 'Aucune permission trouvée',
        'No academic years found. Launch one to get started.': 'Aucune année académique trouvée. Lancez-en une pour commencer.',
        'No scoped schedules yet': 'Aucune planification ciblée pour le moment',
        'Add New Cycle': 'Ajouter un nouveau cycle',
        'Add Dept': 'Ajouter un département',
        'Add Speciality': 'Ajouter une spécialité',
        'Add New Schedule': 'Ajouter une planification',
        'Add Staff': 'Ajouter un membre du personnel',
        'Create Account': 'Créer un compte',
        'Create Role': 'Créer un rôle',
        'Create New Permission': 'Créer une permission',
        'Create New Cycle': 'Créer un nouveau cycle',
        'Create New Department': 'Créer un nouveau département',
        'Confirm & Create': 'Confirmer et créer',
        'View Details': 'Voir les détails',
        'Edit Settings': 'Modifier les paramètres',
        'Delete': 'Supprimer',
        'Approve': 'Approuver',
        'Reject': 'Rejeter',
        'Download PDF': 'Télécharger le PDF',
        'Download Excel': 'Télécharger Excel',
        'Preview Report': 'Aperçu du rapport',
        'No institutions found': 'Aucune institution trouvée',
        'View, manage, and audit all system users.': 'Consulter, gérer et auditer tous les utilisateurs du système.',
        'Manage hierarchical start/end dates for': 'Gérer les dates de début et de fin hiérarchiques pour',
        'Search cycles, departments, classrooms...': 'Rechercher cycles, départements, salles...',
        'Search users...': 'Rechercher des utilisateurs...',
        'Search by user, action, target...': 'Rechercher par utilisateur, action, cible...',
        'Search name, email, matricule...': 'Rechercher par nom, email, matricule...',
        'Search name or code...': 'Rechercher par nom ou code...',
        'Search name or matricule...': 'Rechercher par nom ou matricule...',
        'Search students by name...': 'Rechercher des étudiants par nom...',
        'Search courses...': 'Rechercher des cours...',
        'Search assistants...': 'Rechercher des assistants...',
        'Search supervisors...': 'Rechercher des superviseurs...',
        'All Cycles': 'Tous les cycles',
        'All Depts': 'Tous les départements',
        'All Specs': 'Toutes les spécialités',
        'All Categories': 'Toutes les catégories',
        'All Severities': 'Toutes les gravités',
        'All Classes': 'Toutes les classes',
        'All Subjects': 'Toutes les matières',
        'All Attendance': 'Toutes les présences',
        'All Statuses': 'Tous les statuts',
        'All Justifications': 'Tous les justificatifs',
        'Select PAs...': 'Sélectionner des AP...',
        'Select Supervisors...': 'Sélectionner des superviseurs...',
        'Select Speciality...': 'Sélectionner une spécialité...',
        'Select Classroom...': 'Sélectionner une salle...',
        'Select Class...': 'Sélectionner une classe...',
        'Select Week...': 'Sélectionner une semaine...',
        'Select Session': 'Sélectionner une session',
        'Select a Session': 'Sélectionner une session',
        'Please select a classroom first': 'Veuillez d’abord sélectionner une salle',
        'Please select at least one cycle.': 'Veuillez sélectionner au moins un cycle.',
        'Please select at least one department.': 'Veuillez sélectionner au moins un département.',
        'Please select at least one speciality.': 'Veuillez sélectionner au moins une spécialité.',
        'Please select at least one classroom.': 'Veuillez sélectionner au moins une salle.',
        'Department Name': 'Nom du département',
        'Department Chief': 'Chef de département',
        'Departments': 'Départements',
        'Speciality': 'Spécialité',
        'Specialities': 'Spécialités',
        'Specialties': 'Spécialités',
        'Student': 'Étudiant',
        'Students': 'Étudiants',
        'Total Students': 'Étudiants totaux',
        'Total Teachers': 'Enseignants totaux',
        'Attendance': 'Présence',
        'Attendance Rate': 'Taux de présence',
        'Daily Attendance': 'Présence quotidienne',
        'Attendance Yield': 'Taux de présence',
        'Present': 'Présent',
        'Excused': 'Excusé',
        'Approved': 'Approuvé',
        'Rejected': 'Rejeté',
        'Scheduled': 'Planifié',
        'Completed': 'Terminé',
        'Cancelled': 'Annulé',
        'Role': 'Rôle',
        'Roles': 'Rôles',
        'Category': 'Catégorie',
        'Severity': 'Gravité',
        'Security': 'Sécurité',
        'First Name': 'Prénom',
        'Preview only. No backend upload is changed here.': 'Aperçu uniquement. Aucun envoi serveur n’est modifié ici.',
        'Profile changes are previewed in the UI. Photo upload is not persisted by this shared modal.': 'Les changements du profil sont prévisualisés dans l’interface. La photo n’est pas enregistrée par ce modal partagé.',
        'There are no active classes available for check-in right now.': 'Aucun cours actif n’est disponible pour le pointage actuellement.'
    });

    const translations = {
        en: {},
        fr: text
    };

    function normalize(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function selectedLanguage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return supportedLanguages.includes(stored) ? stored : 'en';
        } catch (error) {
            return 'en';
        }
    }

    function saveLanguage(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (error) {
            // Storage can be unavailable in private browsing contexts.
        }
    }

    function translated(value, lang) {
        const source = normalize(value);
        if (!source || lang === 'en') return value;
        return translations[lang]?.[source] || translatePattern(source, lang) || value;
    }

    function translatePattern(source, lang) {
        if (lang !== 'fr') return null;
        const classesToday = source.match(/^(\d+)\s+(class|classes)\s+today$/i);
        if (classesToday) {
            const count = Number(classesToday[1]);
            return `${count} ${count > 1 ? 'cours' : 'cours'} aujourd’hui`;
        }
        const minutesAgo = source.match(/^(\d+)\s+min\s+ago$/i);
        if (minutesAgo) return `Il y a ${minutesAgo[1]} min`;
        const weekNumber = source.match(/^Week\s+(\d+)$/i);
        if (weekNumber) return `Semaine ${weekNumber[1]}`;
        const selectedCount = source.match(/^(\d+)\s+Selected$/i);
        if (selectedCount) return `${selectedCount[1]} sélectionné(s)`;
        const noSessionsFor = source.match(/^No sessions for\s+(.+)$/i);
        if (noSessionsFor) {
            const days = {
                Monday: 'lundi',
                Tuesday: 'mardi',
                Wednesday: 'mercredi',
                Thursday: 'jeudi',
                Friday: 'vendredi',
                Saturday: 'samedi',
                Sunday: 'dimanche'
            };
            return `Aucune session pour ${days[noSessionsFor[1]] || noSessionsFor[1]}`;
        }
        const liveNow = source.match(/^Live Now\s*•\s*(.+)$/i);
        if (liveNow) return `En direct • ${liveNow[1]}`;
        const failedCourses = source.match(/^Failed to load courses:\s*(.+)$/i);
        if (failedCourses) return `Échec du chargement des cours : ${failedCourses[1]}`;
        const syncError = source.match(/^Sync Error:\s*(.+)$/i);
        if (syncError) return `Erreur de synchronisation : ${syncError[1]}`;
        const hourNumber = source.match(/^Hour\s+(\d+)$/i);
        if (hourNumber) return `Heure ${hourNumber[1]}`;
        return null;
    }

    function translateTextNode(node, lang) {
        const hadOriginal = originalText.has(node);
        const source = originalText.get(node) || node.nodeValue;
        if (!hadOriginal) originalText.set(node, source);
        const leading = String(source).match(/^\s*/)?.[0] || '';
        const trailing = String(source).match(/\s*$/)?.[0] || '';
        const core = normalize(source);
        const currentCore = normalize(node.nodeValue);
        const mapped = translations[lang]?.[core];
        const mappedCore = normalize(mapped);
        const dynamicTranslation = translatePattern(currentCore, lang);
        let next = source;
        if (lang !== 'en') {
            if (hadOriginal && currentCore && currentCore !== core && currentCore !== mappedCore) {
                next = dynamicTranslation || node.nodeValue;
            } else {
                next = dynamicTranslation || (mapped ? `${leading}${mapped}${trailing}` : source);
            }
        }
        if (node.nodeValue !== next) node.nodeValue = next;
    }

    function attributeStore(element) {
        if (!originalAttributes.has(element)) originalAttributes.set(element, {});
        return originalAttributes.get(element);
    }

    function translateAttribute(element, attr, lang) {
        if (!element.hasAttribute(attr)) return;
        const store = attributeStore(element);
        if (!store[attr]) store[attr] = element.getAttribute(attr);
        const source = store[attr];
        const next = lang === 'en' ? source : translated(source, lang);
        if (element.getAttribute(attr) !== next) element.setAttribute(attr, next);
    }

    function shouldSkipElement(element) {
        return ['SCRIPT', 'STYLE', 'SVG', 'PATH', 'META', 'LINK'].includes(element.tagName) ||
            element.closest('[data-i18n-ignore]');
    }

    function applyExplicitKeys(root, lang) {
        root.querySelectorAll?.('[data-i18n]').forEach((element) => {
            const key = element.dataset.i18n;
            const value = dashboardTranslations[lang]?.[key];
            if (value) element.textContent = value;
        });
        root.querySelectorAll?.('[data-i18n-placeholder]').forEach((element) => {
            const key = element.dataset.i18nPlaceholder;
            const value = dashboardTranslations[lang]?.[key];
            if (value) element.setAttribute('placeholder', value);
        });
        root.querySelectorAll?.('[data-i18n-title]').forEach((element) => {
            const key = element.dataset.i18nTitle;
            const value = dashboardTranslations[lang]?.[key];
            if (value) element.setAttribute('title', value);
        });
        root.querySelectorAll?.('[data-i18n-aria-label]').forEach((element) => {
            const key = element.dataset.i18nAriaLabel;
            const value = dashboardTranslations[lang]?.[key];
            if (value) element.setAttribute('aria-label', value);
        });
    }

    function translateNode(root, lang) {
        if (!root || shouldSkipElement(root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement)) return;
        applyExplicitKeys(root.nodeType === Node.ELEMENT_NODE ? root : document, lang);

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
                if (!normalize(node.nodeValue)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => translateTextNode(node, lang));

        const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : Array.from(document.querySelectorAll('*'));
        elements.forEach((element) => {
            if (shouldSkipElement(element)) return;
            ['placeholder', 'title', 'aria-label'].forEach((attr) => translateAttribute(element, attr, lang));
        });
    }

    function updateSwitch(lang) {
        document.querySelectorAll('[data-dashboard-lang]').forEach((button) => {
            const active = button.dataset.dashboardLang === lang;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
    }

    function localizeFrontendDates(lang) {
        const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
        const dateOptions = lang === 'fr'
            ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
            : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.querySelectorAll('#current-date-teacher, #current-date-student').forEach((element) => {
            element.textContent = new Date().toLocaleDateString(locale, dateOptions);
        });
    }

    function setLanguage(lang) {
        const next = supportedLanguages.includes(lang) ? lang : 'en';
        saveLanguage(next);
        document.documentElement.lang = next;
        applying = true;
        translateNode(document.body, next);
        localizeFrontendDates(next);
        updateSwitch(next);
        applying = false;
        window.dispatchEvent(new CustomEvent('dashboard:language-change', { detail: { lang: next } }));
    }

    function injectLanguageSwitch() {
        if (document.querySelector('.dashboard-lang-switch')) return;
        const themeButton = document.querySelector('#theme-toggle, .dashboard-theme-toggle');
        const actions = themeButton?.parentElement || document.querySelector('main header .flex.items-center.gap-3');
        if (!actions) return;
        const switcher = document.createElement('div');
        switcher.className = 'dashboard-lang-switch flex items-center p-0.5 sm:p-1 bg-white border border-slate-200 rounded-[12px] sm:rounded-2xl shadow-sm mx-0.5 sm:mx-1 shrink-0';
        switcher.setAttribute('aria-label', 'Language selector');
        switcher.innerHTML = `
            <button type="button" class="dashboard-lang-btn px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-black tracking-widest text-slate-500 hover:text-slate-900 focus:outline-none transition-all duration-300" data-dashboard-lang="en" aria-pressed="false">EN</button>
            <button type="button" class="dashboard-lang-btn px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-black tracking-widest text-slate-500 hover:text-slate-900 focus:outline-none transition-all duration-300" data-dashboard-lang="fr" aria-pressed="false">FR</button>`;
        actions.insertBefore(switcher, themeButton || actions.firstChild);
    }

    function installSweetAlertTranslation() {
        if (!window.Swal || window.Swal.__dashboardI18nPatched) return;
        const originalFire = window.Swal.fire.bind(window.Swal);
        window.Swal.fire = function (...args) {
            const lang = selectedLanguage();
            if (typeof args[0] === 'string') args[0] = translated(args[0], lang);
            if (typeof args[1] === 'string') args[1] = translated(args[1], lang);
            if (args[0] && typeof args[0] === 'object') {
                ['title', 'text', 'html', 'confirmButtonText', 'cancelButtonText', 'denyButtonText'].forEach((key) => {
                    if (typeof args[0][key] === 'string') args[0][key] = translated(args[0][key], lang);
                });
            }
            return originalFire(...args);
        };
        window.Swal.__dashboardI18nPatched = true;
    }

    const dashboardTranslations = {
        en: {
            dashboardOverview: 'Overview',
            activeSession: 'Active Session',
            myProfile: 'My Profile',
            adminDashboardOverview: 'Dashboard Overview',
            adminOverviewSubtitle: "Welcome back! Here's what's happening with your system today.",
            systemInsights: 'System Insights',
            totalUsers: 'Total Users',
            activeSessions: 'Active Sessions',
            departments: 'Departments',
            activeStaff: 'Active Staff',
            students: 'Students',
            admins: 'Admins',
            totalStructures: 'Total Structures',
            totalStudents: 'Total Students',
            totalTeachers: 'Total Teachers',
            activeCourses: 'Active Courses',
            stable: 'Stable',
            attendanceRate: 'Attendance Rate',
            currentClass: 'Current Class',
            classesToday: 'Classes Today',
            todaysCovered: "Today's Covered",
            overallHours: 'Overall Hours',
            upcomingSession: 'Upcoming Session'
        },
        fr: {
            dashboardOverview: 'Vue d’ensemble',
            activeSession: 'Session active',
            myProfile: 'Mon profil',
            adminDashboardOverview: 'Vue d’ensemble',
            adminOverviewSubtitle: 'Bon retour ! Voici l’activité de votre système aujourd’hui.',
            systemInsights: 'Indicateurs système',
            totalUsers: 'Utilisateurs totaux',
            activeSessions: 'Sessions actives',
            departments: 'Départements',
            activeStaff: 'Personnel actif',
            students: 'Étudiants',
            admins: 'Admins',
            totalStructures: 'Structures totales',
            totalStudents: 'Étudiants totaux',
            totalTeachers: 'Enseignants totaux',
            activeCourses: 'Cours actifs',
            stable: 'Stable',
            attendanceRate: 'Taux de présence',
            currentClass: 'Cours en cours',
            classesToday: 'Cours aujourd’hui',
            todaysCovered: 'Cours assurés aujourd’hui',
            overallHours: 'Heures totales',
            upcomingSession: 'Session à venir'
        }
    };

    function init() {
        if (!document.body?.dataset.dashboardRole) return;
        injectLanguageSwitch();
        installSweetAlertTranslation();
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-dashboard-lang]');
            if (!button) return;
            event.preventDefault();
            setLanguage(button.dataset.dashboardLang);
        });

        const observer = new MutationObserver((mutations) => {
            if (applying || selectedLanguage() === 'en') return;
            applying = true;
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' && mutation.target.parentElement) {
                    translateNode(mutation.target.parentElement, selectedLanguage());
                }
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                        translateNode(node.nodeType === Node.TEXT_NODE ? node.parentElement : node, selectedLanguage());
                    }
                });
            });
            localizeFrontendDates(selectedLanguage());
            updateSwitch(selectedLanguage());
            applying = false;
        });

        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        setLanguage(selectedLanguage());
    }

    window.dashboardTranslations = dashboardTranslations;
    window.setDashboardLanguage = setLanguage;
    window.getDashboardLanguage = selectedLanguage;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
