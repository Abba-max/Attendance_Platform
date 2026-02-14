/**
 * Admin Dashboard JavaScript
 * This file handles interactive elements of the admin panel.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin Dashboard initialized');

    // Sidebar Toggle for Mobile
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Generic form validation or interactive elements can be added here
    const autoDismissAlerts = document.querySelectorAll('.alert');
    autoDismissAlerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
});
