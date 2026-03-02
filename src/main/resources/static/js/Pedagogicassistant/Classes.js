// dashboard.js

// Global variables
let editingCard = null;

// Function to attach edit and delete listeners to all buttons
function attachListeners() {
  document.querySelectorAll('.class-actions .btn-edit').forEach(btn => {
    btn.addEventListener('click', handleEdit);
  });
  document.querySelectorAll('.class-actions .btn-delete').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });
}

// Handle edit button click
function handleEdit(e) {
  editingCard = e.target.closest('.class-card');
  document.querySelector('.section-header h2').textContent = "Edit Course";
  document.getElementById('submitBtn').textContent = "Update Course";

  const courseName = editingCard.querySelector('.class-header h3').textContent;
  const courseCode = editingCard.querySelector('.badge').textContent;
  const teacherId = editingCard.querySelector('.class-body p:nth-child(1)').textContent.replace('Teacher ID: ', '');
  const totalHours = editingCard.querySelector('.class-body p:nth-child(3)').textContent.replace('Total Hours: ', '');
  const executedHours = editingCard.querySelector('.class-body p:nth-child(4)').textContent.replace('Executed Hours: ', '');
  const credits = editingCard.querySelector('.class-body p:nth-child(5)').textContent.replace('Credits: ', '');
  const description = ''; // Description not displayed in card, default to empty

  document.getElementById('courseName').value = courseName;
  document.getElementById('courseCode').value = courseCode;
  document.getElementById('teacherId').value = teacherId;
  document.getElementById('totalHours').value = totalHours;
  document.getElementById('executedHours').value = executedHours;
  document.getElementById('credits').value = credits;
  document.getElementById('description').value = description;
}

// Handle delete button click
function handleDelete(e) {
  const card = e.target.closest('.class-card');
  if (confirm('Are you sure you want to delete this course?')) {
    card.remove();
  }
}

// Handle form submission (client-side add/update)
const form = document.getElementById('createCourseForm');
form.addEventListener('submit', function(e) {
  e.preventDefault();

  const courseName = document.getElementById('courseName').value;
  const courseCode = document.getElementById('courseCode').value;
  const teacherId = document.getElementById('teacherId').value;
  const description = document.getElementById('description').value;
  const totalHours = document.getElementById('totalHours').value;
  const executedHours = document.getElementById('executedHours').value || 0;
  const credits = document.getElementById('credits').value;

  if (editingCard) {
    // Update existing card
    editingCard.querySelector('.class-header h3').textContent = courseName;
    editingCard.querySelector('.badge').textContent = courseCode;
    editingCard.querySelector('.class-body p:nth-child(1)').textContent = `Teacher ID: ${teacherId}`;
    editingCard.querySelector('.class-body p:nth-child(3)').textContent = `Total Hours: ${totalHours}`;
    editingCard.querySelector('.class-body p:nth-child(4)').textContent = `Executed Hours: ${executedHours}`;
    editingCard.querySelector('.class-body p:nth-child(5)').textContent = `Credits: ${credits}`;
    // Note: Students count not updated as it's not part of the form
  } else {
    // Add new card
    const newCard = document.createElement('div');
    newCard.classList.add('class-card');
    newCard.innerHTML = `
      <div class="class-header">
        <h3>${courseName}</h3>
        <span class="badge">${courseCode}</span>
      </div>
      <div class="class-body">
        <p><strong>Teacher ID:</strong> ${teacherId}</p>
        <p><strong>Students:</strong> 0 Enrolled</p>
        <p><strong>Total Hours:</strong> ${totalHours}</p>
        <p><strong>Executed Hours:</strong> ${executedHours}</p>
        <p><strong>Credits:</strong> ${credits}</p>
      </div>
      <div class="class-actions">
        <button class="btn-outline btn-edit">Edit</button>
        <button class="btn-outline btn-delete">Delete</button>
      </div>
    `;
    document.querySelector('.cards-grid').appendChild(newCard);
    // Attach listeners to the new buttons
    newCard.querySelector('.btn-edit').addEventListener('click', handleEdit);
    newCard.querySelector('.btn-delete').addEventListener('click', handleDelete);
  }

  // Reset form and UI
  form.reset();
  document.querySelector('.section-header h2').textContent = "Add New Course";
  document.getElementById('submitBtn').textContent = "Save Course";
  editingCard = null;
});

// Handle form reset (clear button)
form.addEventListener('reset', function() {
  document.querySelector('.section-header h2').textContent = "Add New Course";
  document.getElementById('submitBtn').textContent = "Save Course";
  editingCard = null;
});

// Handle search input
document.getElementById('classSearch').addEventListener('input', function() {
  const filter = this.value.toLowerCase();
  const cards = document.querySelectorAll('.class-card');
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(filter) ? '' : 'none';
  });
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  attachListeners();
});