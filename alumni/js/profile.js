// ============================================================
// Alumni Portal — Profile Page Logic
// ============================================================

// Guard: require authentication
if (!Auth.requireAuth()) throw new Error("Not authenticated");

// Set nav user email
const decoded = Auth.decodeToken();
if (decoded) {
  document.getElementById("nav-user-email").textContent = decoded.email || "";
}

// ===== State =====
let profileData = {};

// ===== Init: Load Profile =====
async function loadProfile() {
  try {
    const data = await apiFetch("/profiles");
    profileData = data;

    // User name & email
    const user = Auth.getUser();
    document.getElementById("profile-name").textContent =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || decoded?.email || "Alumni";
    document.getElementById("profile-email").textContent = decoded?.email || "";

    // Avatar initials
    const initials = (decoded?.email || "?")[0].toUpperCase();
    document.getElementById("avatar-initials").textContent = initials;

    // Profile image
    if (data.profile?.profile_image_url) {
      const img = document.getElementById("avatar-img");
      img.src = data.profile.profile_image_url;
      img.classList.remove("hidden");
      document.getElementById("avatar-initials").classList.add("hidden");
    }

    // Bio
    if (data.profile?.bio) {
      document.getElementById("bio-text").textContent = data.profile.bio;
      document.getElementById("bio-text").classList.remove("text-muted");
    }

    // LinkedIn
    if (data.profile?.linkedin_url) {
      document.getElementById("profile-linkedin").href = data.profile.linkedin_url;
      document.getElementById("profile-linkedin-wrap").classList.remove("hidden");
    }

    // Pre-fill edit form
    document.getElementById("edit-bio").value = data.profile?.bio || "";
    document.getElementById("edit-linkedin").value = data.profile?.linkedin_url || "";

    // Load all sections
    await Promise.all([
      loadItems("degrees"),
      loadItems("certifications"),
      loadItems("licences"),
      loadItems("courses"),
      loadItems("employment"),
    ]);

    // Show content, hide loading
    document.getElementById("page-loading").classList.add("hidden");
    document.getElementById("profile-content").classList.remove("hidden");
  } catch (err) {
    document.getElementById("page-loading").classList.add("hidden");
    if (err.status === 401 || err.status === 400) {
      Auth.clearSession();
      window.location.href = "login.html";
      return;
    }
    showPageAlert("Failed to load profile. Please try again.", "error");
    document.getElementById("profile-content").classList.remove("hidden");
  }
}

// ===== Bio Edit Toggle =====
function toggleBioEdit() {
  const form = document.getElementById("bio-form");
  const display = document.getElementById("bio-display");
  form.classList.toggle("hidden");
  display.classList.toggle("hidden");
}

// ===== Save Bio =====
async function saveBio(e) {
  e.preventDefault();
  const bio = document.getElementById("edit-bio").value.trim();
  const linkedinUrl = document.getElementById("edit-linkedin").value.trim();

  try {
    await apiFetch("/profiles", {
      method: "PUT",
      body: JSON.stringify({ bio, linkedinUrl }),
    });

    // Update display
    document.getElementById("bio-text").textContent = bio || "No bio set yet.";
    document.getElementById("bio-text").classList.toggle("text-muted", !bio);

    if (linkedinUrl) {
      document.getElementById("profile-linkedin").href = linkedinUrl;
      document.getElementById("profile-linkedin-wrap").classList.remove("hidden");
    }

    toggleBioEdit();
    showPageAlert("Profile updated successfully!", "success");
  } catch (err) {
    showPageAlert(err.data?.error || "Failed to update profile.", "error");
  }
}

// ===== Profile Image Upload =====
document.getElementById("avatar-upload").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("profileImage", file);

  try {
    const data = await apiFetch("/profiles/image", {
      method: "POST",
      body: formData,
    });

    // Update avatar
    const img = document.getElementById("avatar-img");
    img.src = data.imageUrl;
    img.classList.remove("hidden");
    document.getElementById("avatar-initials").classList.add("hidden");
    showPageAlert("Profile image uploaded!", "success");
  } catch (err) {
    showPageAlert(err.data?.error || "Failed to upload image.", "error");
  }
});

// ===== Toggle Add Form =====
function toggleAddForm(section) {
  const form = document.getElementById(`add-${section}-form`);
  form.classList.toggle("hidden");
}

// ===== Generic: Load Items =====
async function loadItems(section) {
  try {
    const data = await apiFetch(`/profiles/${section}`);
    renderItems(section, data);
  } catch (err) {
    console.error(`Failed to load ${section}:`, err);
  }
}

// ===== Generic: Add Item =====
async function addItem(e, section) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const body = Object.fromEntries(formData.entries());

  // Remove empty optional fields
  Object.keys(body).forEach((k) => {
    if (body[k] === "") delete body[k];
  });

  try {
    await apiFetch(`/profiles/${section}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    form.reset();
    form.classList.add("hidden");
    await loadItems(section);
    showPageAlert(`${capitalize(section)} added successfully!`, "success");
  } catch (err) {
    const msg =
      err.data?.errors?.map((e) => e.msg).join(" | ") ||
      err.data?.error ||
      `Failed to add ${section}.`;
    showPageAlert(msg, "error");
  }
}

// ===== Generic: Delete Item =====
async function deleteItem(section, id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    await apiFetch(`/profiles/${section}/${id}`, { method: "DELETE" });
    await loadItems(section);
    showPageAlert("Item deleted.", "success");
  } catch (err) {
    showPageAlert(err.data?.error || "Failed to delete.", "error");
  }
}

// ===== Render Items =====
function renderItems(section, items) {
  const container = document.getElementById(`${section}-list`);

  if (!items || items.length === 0) {
    const icons = { degrees: "🎓", certifications: "📜", licences: "🪪", courses: "📚", employment: "💼" };
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">${icons[section] || "📋"}</div><p>No ${section} added yet</p></div>`;
    return;
  }

  container.innerHTML = items.map((item) => {
    let title = "";
    let meta = "";

    switch (section) {
      case "degrees":
        title = item.degree_name || item.degreeName || "Degree";
        meta = `
          <span>📅 ${formatDate(item.completion_date || item.completionDate)}</span>
          ${item.university_url || item.universityUrl ? `<a href="${item.university_url || item.universityUrl}" target="_blank" rel="noopener">🔗 University Page</a>` : ""}
        `;
        break;
      case "certifications":
        title = item.cert_name || item.name || "Certification";
        meta = `
          <span>📅 ${formatDate(item.completion_date || item.completionDate)}</span>
          ${item.course_url || item.url ? `<a href="${item.course_url || item.url}" target="_blank" rel="noopener">🔗 Course Page</a>` : ""}
        `;
        break;
      case "licences":
        title = item.licence_name || item.name || "Licence";
        meta = `
          <span>📅 ${formatDate(item.completion_date || item.completionDate)}</span>
          ${item.body_url || item.url ? `<a href="${item.body_url || item.url}" target="_blank" rel="noopener">🔗 Awarding Body</a>` : ""}
        `;
        break;
      case "courses":
        title = item.course_name || item.name || "Course";
        meta = `
          <span>📅 ${formatDate(item.completion_date || item.completionDate)}</span>
          ${item.course_url || item.url ? `<a href="${item.course_url || item.url}" target="_blank" rel="noopener">🔗 Course Page</a>` : ""}
        `;
        break;
      case "employment":
        title = `${item.role} at ${item.company_name || item.companyName}`;
        meta = `
          <span>📅 ${formatDate(item.start_date || item.startDate)} — ${item.end_date || item.endDate ? formatDate(item.end_date || item.endDate) : "Present"}</span>
        `;
        break;
    }

    return `
      <div class="item-row">
        <div class="item-info">
          <div class="item-title">${escapeHtml(title)}</div>
          <div class="item-meta">${meta}</div>
        </div>
        <div class="item-actions">
          <button class="btn-danger btn-sm" onclick="deleteItem('${section}', ${item.id})">🗑 Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

// ===== Helpers =====
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showPageAlert(msg, type = "error") {
  const box = document.getElementById("page-alert");
  const msgEl = document.getElementById("page-alert-msg");
  box.className = `alert ${type}`;
  msgEl.textContent = msg;
  // Auto-hide after 5s
  setTimeout(() => {
    box.className = "alert hidden";
  }, 5000);
}

// ===== Init =====
loadProfile();
