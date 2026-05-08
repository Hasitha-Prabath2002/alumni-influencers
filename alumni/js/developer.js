// ============================================================
// Alumni Portal — Developer API Key Management Logic
// ============================================================

if (!Auth.requireAuth()) throw new Error("Not authenticated");

const decoded = Auth.decodeToken();
if (decoded) {
  document.getElementById("nav-user-email").textContent = decoded.email || "";
}

let lastGeneratedKey = "";

// ===== Generate Key =====
async function generateKey(e) {
  e.preventDefault();

  const name = document.getElementById("key-name").value.trim();
  const clientType = document.getElementById("key-type").value;

  if (!name) {
    showAlert("Please enter a key name.", "error");
    return;
  }

  setBtnLoading("generate-btn", true);
  try {
    const data = await apiFetch("/developer/keys", {
      method: "POST",
      body: JSON.stringify({ name, clientType }),
    });

    lastGeneratedKey = data.apiKey;
    document.getElementById("generated-key-value").textContent = data.apiKey;
    document.getElementById("generated-key-display").classList.remove("hidden");

    // Also store it locally for the bidding page featured section
    localStorage.setItem("alumni_dev_api_key", data.apiKey);

    document.getElementById("key-name").value = "";
    showAlert("API key generated successfully! 🔐", "success");

    // Refresh keys list
    loadKeys();
  } catch (err) {
    showAlert(
      err.data?.error || err.data?.errors?.[0]?.msg || "Failed to generate key.",
      "error"
    );
  } finally {
    setBtnLoading("generate-btn", false);
  }
}

// ===== Copy Key to Clipboard =====
function copyKey() {
  navigator.clipboard.writeText(lastGeneratedKey).then(() => {
    showAlert("API key copied to clipboard! 📋", "success");
  }).catch(() => {
    // Fallback
    const el = document.createElement("textarea");
    el.value = lastGeneratedKey;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showAlert("API key copied! 📋", "success");
  });
}

// ===== Load Keys =====
async function loadKeys() {
  try {
    const keys = await apiFetch("/developer/keys");

    document.getElementById("keys-loading").classList.add("hidden");

    if (!keys || keys.length === 0) {
      document.getElementById("keys-empty").classList.remove("hidden");
      document.getElementById("keys-list").classList.add("hidden");
      return;
    }

    document.getElementById("keys-empty").classList.add("hidden");
    document.getElementById("keys-list").classList.remove("hidden");

    const tbody = document.getElementById("keys-table-body");
    tbody.innerHTML = keys.map((key) => {
      const perms = Array.isArray(key.permissions)
        ? key.permissions
        : (() => { try { return JSON.parse(key.permissions || "[]"); } catch { return []; } })();

      return `
        <tr>
          <td style="font-weight:600;">${escapeHtml(key.name)}</td>
          <td><code style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(key.key_prefix || "")}</code></td>
          <td><span class="tag tag-accent">${escapeHtml(key.client_type || "general")}</span></td>
          <td>${perms.map((p) => `<span class="tag tag-success" style="margin:2px;">${escapeHtml(p)}</span>`).join("")}</td>
          <td class="text-muted text-xs">${formatDate(key.created_at)}</td>
          <td>
            ${key.is_revoked
              ? '<span class="status-revoked">Revoked</span>'
              : '<span class="status-active">Active</span>'
            }
          </td>
          <td>
            <div class="key-actions">
              <button class="btn-secondary btn-sm" onclick="viewStats(${key.id})">📊 Stats</button>
              ${!key.is_revoked
                ? `<button class="btn-danger btn-sm" onclick="revokeKey(${key.id})">Revoke</button>`
                : ""
              }
            </div>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    document.getElementById("keys-loading").classList.add("hidden");
    showAlert("Failed to load API keys.", "error");
  }
}

// ===== Revoke Key =====
async function revokeKey(id) {
  if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) return;

  try {
    await apiFetch(`/developer/keys/${id}`, { method: "DELETE" });
    showAlert("API key revoked. 🔒", "success");
    loadKeys();
  } catch (err) {
    showAlert(err.data?.error || "Failed to revoke key.", "error");
  }
}

// ===== View Stats =====
async function viewStats(id) {
  document.getElementById("stats-backdrop").classList.remove("hidden");
  document.getElementById("stats-modal").classList.remove("hidden");
  document.getElementById("stats-loading").classList.remove("hidden");
  document.getElementById("stats-data").classList.add("hidden");

  try {
    const data = await apiFetch(`/developer/keys/${id}/stats`);

    document.getElementById("stats-loading").classList.add("hidden");
    document.getElementById("stats-data").classList.remove("hidden");

    const perms = Array.isArray(data.permissions) ? data.permissions : [];

    let html = `
      <div class="stats-section">
        <div class="stats-info-row">
          <div class="stats-info-item">
            <div class="stats-label">Key Name</div>
            <div class="stats-value">${escapeHtml(data.keyName || "")}</div>
          </div>
          <div class="stats-info-item">
            <div class="stats-label">Client Type</div>
            <div class="stats-value">${escapeHtml(data.clientType || "")}</div>
          </div>
          <div class="stats-info-item">
            <div class="stats-label">Status</div>
            <div class="stats-value">${data.isRevoked ? "🔴 Revoked" : "🟢 Active"}</div>
          </div>
          <div class="stats-info-item">
            <div class="stats-label">Permissions</div>
            <div class="stats-value">${perms.join(", ") || "None"}</div>
          </div>
        </div>
      </div>
    `;

    // Usage Summary
    if (data.usageSummary && data.usageSummary.length > 0) {
      html += `
        <div class="stats-section">
          <h4>Endpoint Usage Summary</h4>
          <table class="stats-table">
            <thead>
              <tr><th>Endpoint</th><th>Method</th><th>Hits</th><th>First Used</th><th>Last Used</th></tr>
            </thead>
            <tbody>
              ${data.usageSummary.map((s) => `
                <tr>
                  <td>${escapeHtml(s.endpoint)}</td>
                  <td><span class="tag tag-accent">${s.method}</span></td>
                  <td style="font-weight:600;">${s.hit_count}</td>
                  <td class="text-xs">${formatDate(s.first_used)}</td>
                  <td class="text-xs">${formatDate(s.last_used)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    } else {
      html += `<div class="stats-section"><h4>Endpoint Usage</h4><p class="text-muted text-sm">No usage recorded yet.</p></div>`;
    }

    // Recent Activity
    if (data.recentActivity && data.recentActivity.length > 0) {
      html += `
        <div class="stats-section">
          <h4>Recent Activity (Last 50)</h4>
          <table class="stats-table">
            <thead>
              <tr><th>Endpoint</th><th>Method</th><th>IP Address</th><th>Timestamp</th></tr>
            </thead>
            <tbody>
              ${data.recentActivity.map((a) => `
                <tr>
                  <td>${escapeHtml(a.endpoint)}</td>
                  <td><span class="tag tag-accent">${a.method}</span></td>
                  <td class="text-xs">${escapeHtml(a.ip_address || "—")}</td>
                  <td class="text-xs">${formatDate(a.timestamp)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    document.getElementById("stats-data").innerHTML = html;
  } catch (err) {
    document.getElementById("stats-loading").classList.add("hidden");
    document.getElementById("stats-data").classList.remove("hidden");
    document.getElementById("stats-data").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <p>Failed to load usage statistics.</p>
      </div>
    `;
  }
}

function closeStatsModal() {
  document.getElementById("stats-backdrop").classList.add("hidden");
  document.getElementById("stats-modal").classList.add("hidden");
}

// ===== Helpers =====
function showAlert(msg, type = "error") {
  const box = document.getElementById("page-alert");
  const msgEl = document.getElementById("page-alert-msg");
  box.className = `alert ${type}`;
  msgEl.textContent = msg;
  setTimeout(() => { box.className = "alert hidden"; }, 5000);
}

function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".btn-spinner");
  if (text) text.style.opacity = loading ? "0" : "1";
  if (spinner) spinner.classList.toggle("hidden", !loading);
  btn.disabled = loading;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

// ===== Init =====
loadKeys();
