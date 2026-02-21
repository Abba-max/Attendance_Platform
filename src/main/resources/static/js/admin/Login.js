// Prevent users from clicking the login button multiple times
document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.querySelector(".login-btn");

    if (loginForm) {
        loginForm.addEventListener("submit", function() {
            // Change button text and disable it to prevent double-submits
            loginBtn.textContent = "Logging in...";
            loginBtn.style.opacity = "0.7";
            loginBtn.style.cursor = "not-allowed";

            // Allow the form to submit naturally
        });
    }
});