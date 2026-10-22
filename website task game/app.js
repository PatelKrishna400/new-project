// Simple Student Complaint Management System Logic

// App State (No demo data - starts completely empty)
let complaints = JSON.parse(localStorage.getItem("student_complaints_db")) || [];
let currentRole = "student"; // "student" or "admin"
let activeModalId = null;

// DOM Elements
const btnStudentRole = document.getElementById("btnStudentRole");
const btnAdminRole = document.getElementById("btnAdminRole");
const themeBtn = document.getElementById("themeBtn");
const studentView = document.getElementById("studentView");
const adminView = document.getElementById("adminView");
const newComplaintForm = document.getElementById("newComplaintForm");

// Admin Table & Filters
const complaintsTableBody = document.getElementById("complaintsTableBody");
const emptyMessage = document.getElementById("emptyMessage");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterCategory = document.getElementById("filterCategory");

// Stats Elements (Admin)
const statTotal = document.getElementById("statTotal");
const statPending = document.getElementById("statPending");
const statProgress = document.getElementById("statProgress");
const statResolved = document.getElementById("statResolved");

// Modal Elements
const detailModal = document.getElementById("detailModal");
const modalClose = document.getElementById("modalClose");
const modalId = document.getElementById("modalId");
const mStudent = document.getElementById("mStudent");
const mRoll = document.getElementById("mRoll");
const mCategory = document.getElementById("mCategory");
const mPriority = document.getElementById("mPriority");
const mDate = document.getElementById("mDate");
const mStatusBadge = document.getElementById("mStatusBadge");
const mSubject = document.getElementById("mSubject");
const mDetails = document.getElementById("mDetails");
const adminStatusBlock = document.getElementById("adminStatusBlock");
const adminStatusSelect = document.getElementById("adminStatusSelect");
const btnSaveStatus = document.getElementById("btnSaveStatus");
const toast = document.getElementById("toast");

// Admin Password Elements
const passwordModal = document.getElementById("passwordModal");
const adminPwdForm = document.getElementById("adminPwdForm");
const adminPwdInput = document.getElementById("adminPwdInput");
const pwdError = document.getElementById("pwdError");
const pwdCloseBtn = document.getElementById("pwdCloseBtn");
const btnCancelPwd = document.getElementById("btnCancelPwd");

// Initialize
function init() {
  switchRole("student"); // Default: Student views ONLY complaint form
  bindEvents();
}

// Save to LocalStorage
function saveComplaints() {
  localStorage.setItem("student_complaints_db", JSON.stringify(complaints));
  renderStats();
}

// Render Stats Cards (For Admin)
function renderStats() {
  if (!statTotal) return;
  statTotal.textContent = complaints.length;
  statPending.textContent = complaints.filter(c => c.status === "Pending").length;
  statProgress.textContent = complaints.filter(c => c.status === "In Progress").length;
  statResolved.textContent = complaints.filter(c => c.status === "Resolved").length;
}

// Render Admin Complaints Table (With Student Name)
function renderComplaints() {
  if (!complaintsTableBody) return;
  const query = searchInput.value.toLowerCase().trim();
  const statusVal = filterStatus.value;
  const catVal = filterCategory.value;

  const filtered = complaints.filter(c => {
    const matchesSearch = !query || 
      c.id.toLowerCase().includes(query) ||
      c.student.toLowerCase().includes(query) ||
      c.subject.toLowerCase().includes(query) ||
      c.roll.toLowerCase().includes(query);

    const matchesStatus = statusVal === "ALL" || c.status === statusVal;
    const matchesCat = catVal === "ALL" || c.category === catVal;

    return matchesSearch && matchesStatus && matchesCat;
  });

  if (filtered.length === 0) {
    complaintsTableBody.innerHTML = "";
    emptyMessage.classList.remove("hidden");
    return;
  }

  emptyMessage.classList.add("hidden");
  complaintsTableBody.innerHTML = filtered.map(c => `
    <tr>
      <td><strong>${c.id}</strong></td>
      <td><strong>${escapeHtml(c.student)}</strong></td>
      <td><span style="color:var(--text-muted); font-size:0.85rem;">${escapeHtml(c.roll)}</span></td>
      <td>${c.category}</td>
      <td>${escapeHtml(c.subject)}</td>
      <td><span class="badge priority-${c.priority.toLowerCase()}">${c.priority}</span></td>
      <td>${c.date}</td>
      <td><span class="badge ${getStatusClass(c.status)}">${c.status}</span></td>
      <td>
        <button class="action-btn" onclick="openDetail('${c.id}')"><i class="fa-solid fa-eye"></i> View</button>
        <button class="action-btn del-btn" onclick="deleteComplaint('${c.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("");
}

// Get Badge Class
function getStatusClass(status) {
  if (status === "Pending") return "pending";
  if (status === "In Progress") return "progress";
  if (status === "Resolved") return "resolved";
  return "";
}

// Open Details Modal
function openDetail(id) {
  const c = complaints.find(item => item.id === id);
  if (!c) return;

  activeModalId = id;
  modalId.textContent = `Complaint ${c.id}`;
  mStudent.textContent = c.student;
  mRoll.textContent = c.roll;
  mCategory.textContent = c.category;
  mPriority.textContent = c.priority;
  mDate.textContent = c.date;
  mSubject.textContent = c.subject;
  mDetails.textContent = c.details;

  mStatusBadge.className = `badge ${getStatusClass(c.status)}`;
  mStatusBadge.textContent = c.status;

  if (currentRole === "admin") {
    adminStatusBlock.classList.remove("hidden");
    adminStatusSelect.value = c.status;
  } else {
    adminStatusBlock.classList.add("hidden");
  }

  detailModal.classList.remove("hidden");
}

// Close Modal
function closeModal() {
  detailModal.classList.add("hidden");
  activeModalId = null;
}

// Delete Complaint (Admin only)
function deleteComplaint(id) {
  if (confirm(`Delete complaint ${id}?`)) {
    complaints = complaints.filter(c => c.id !== id);
    saveComplaints();
    renderComplaints();
    showToast(`Complaint ${id} deleted.`);
  }
}

// Switch Role: Student View (Only form) vs Admin View (With Student Name & Complaints)
function switchRole(role) {
  currentRole = role;
  if (role === "student") {
    btnStudentRole.classList.add("active");
    btnAdminRole.classList.remove("active");
    studentView.classList.remove("hidden");
    adminView.classList.add("hidden");
  } else {
    btnAdminRole.classList.add("active");
    btnStudentRole.classList.remove("active");
    studentView.classList.add("hidden");
    adminView.classList.remove("hidden");
    renderStats();
    renderComplaints();
  }
}

// Show Toast
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// HTML escape helper
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Bind Events
function bindEvents() {
  // Switch to Student (Complaint form only)
  btnStudentRole.addEventListener("click", () => {
    switchRole("student");
    showToast("Student Mode: Complaint Form");
  });
  
  // Switch to Admin (Requires password 0911)
  btnAdminRole.addEventListener("click", () => {
    if (currentRole === "admin") return;
    adminPwdInput.value = "";
    pwdError.classList.add("hidden");
    passwordModal.classList.remove("hidden");
    adminPwdInput.focus();
  });

  // Admin Password Form Submit (0911)
  adminPwdForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (adminPwdInput.value.trim() === "0911") {
      passwordModal.classList.add("hidden");
      switchRole("admin");
      showToast("Admin access unlocked.");
    } else {
      pwdError.classList.remove("hidden");
      adminPwdInput.select();
    }
  });

  // Close Password Modal
  pwdCloseBtn.addEventListener("click", () => passwordModal.classList.add("hidden"));
  btnCancelPwd.addEventListener("click", () => passwordModal.classList.add("hidden"));
  passwordModal.addEventListener("click", (e) => {
    if (e.target === passwordModal) passwordModal.classList.add("hidden");
  });

  // Theme
  themeBtn.addEventListener("click", () => {
    const isLight = document.body.getAttribute("data-theme") === "light";
    if (isLight) {
      document.body.removeAttribute("data-theme");
      themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      document.body.setAttribute("data-theme", "light");
      themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  });

  // Search and Filters (Admin)
  searchInput.addEventListener("input", renderComplaints);
  filterStatus.addEventListener("change", renderComplaints);
  filterCategory.addEventListener("change", renderComplaints);

  // Form Submit by Student
  newComplaintForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const roll = document.getElementById("rollNo").value.trim();
    const cat = document.getElementById("category").value;
    const pri = document.getElementById("priority").value;
    const subj = document.getElementById("subject").value.trim();
    const det = document.getElementById("details").value.trim();

    if (!name || !roll || !cat || !subj || !det) return;

    const newId = "CMP-" + Math.floor(100 + Math.random() * 900);
    const today = new Date().toISOString().split("T")[0];

    const newComplaint = {
      id: newId,
      student: name,
      roll: roll,
      category: cat,
      subject: subj,
      details: det,
      priority: pri,
      date: today,
      status: "Pending"
    };

    complaints.unshift(newComplaint);
    saveComplaints();

    newComplaintForm.reset();
    showToast(`Complaint ${newId} submitted successfully!`);
  });

  // Modal Close
  modalClose.addEventListener("click", closeModal);
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });

  // Admin Save Status
  btnSaveStatus.addEventListener("click", () => {
    if (!activeModalId) return;
    const c = complaints.find(item => item.id === activeModalId);
    if (c) {
      c.status = adminStatusSelect.value;
      saveComplaints();
      renderComplaints();
      mStatusBadge.className = `badge ${getStatusClass(c.status)}`;
      mStatusBadge.textContent = c.status;
      showToast(`Status updated to ${c.status}.`);
    }
  });
}

// Global exposure for inline onclick handlers
window.openDetail = openDetail;
window.deleteComplaint = deleteComplaint;

// Start App
document.addEventListener("DOMContentLoaded", init);
