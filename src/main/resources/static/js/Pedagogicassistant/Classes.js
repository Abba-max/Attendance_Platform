document.addEventListener("DOMContentLoaded", function() {


    const searchInput = document.getElementById('classSearch');
    const classCards = document.querySelectorAll('.class-card');

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            classCards.forEach(card => {
                const cardText = card.textContent.toLowerCase();
                card.style.display = cardText.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    }


    const createForm = document.getElementById('createCourseForm');
    const submitBtn = document.getElementById('submitBtn');

    if (createForm && submitBtn) {
        createForm.addEventListener('submit', function() {

            submitBtn.textContent = 'Saving...';
            submitBtn.style.opacity = '0.7';
            submitBtn.style.pointerEvents = 'none';

        });
    }

});