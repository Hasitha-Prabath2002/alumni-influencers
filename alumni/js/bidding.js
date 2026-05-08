// ============================================================
// Alumni Portal — Bidding Page Logic
// ============================================================

if (!Auth.requireAuth()) throw new Error("Not authenticated");

const decoded = Auth.decodeToken();
if (decoded) {
  document.getElementById("nav-user-email").textContent = decoded.email || "";
}

// ===== Load Bid Status =====
async function loadBidStatus() {
  try {
    const data = await apiFetch("/bids/status");
    const content = document.getElementById("status-content");
    const loading = document.getElementById("status-loading");
    const dot = document.getElementById("status-dot");
    const label = document.getElementById("status-label");
    const desc = document.getElementById("status-desc");

    loading.classList.add("hidden");
    content.classList.remove("hidden");

    dot.className = "status-dot";
    label.className = "status-label";

    switch (data.status) {
      case "CURRENTLY_WINNING":
        dot.classList.add("winning");
        label.classList.add("winning", "pulse");
        label.textContent = "🏆 Currently Winning!";
        desc.textContent = "You are the highest bidder for tomorrow's slot.";
        break;
      case "LOSING":
        dot.classList.add("losing");
        label.classList.add("losing");
        label.textContent = "📉 Currently Losing";
        desc.textContent = "Someone has outbid you. Consider increasing your bid.";
        break;
      case "NO_BID":
      default:
        dot.classList.add("no-bid");
        label.classList.add("no-bid");
        label.textContent = "⏳ No Bid Placed";
        desc.textContent = "You haven't placed a bid for tomorrow yet.";
        break;
    }
  } catch (err) {
    document.getElementById("status-loading").classList.add("hidden");
    document.getElementById("status-content").classList.remove("hidden");
    document.getElementById("status-label").textContent = "Error loading status";
  }
}

// ===== Load Monthly Limit =====
async function loadMonthlyLimit() {
  try {
    const data = await apiFetch("/bids/monthly-limit");
    document.getElementById("win-count").textContent = data.winCount || 0;
    document.getElementById("win-max").textContent = data.maxWins || 3;

    const pct = data.maxWins ? Math.min((data.winCount / data.maxWins) * 100, 100) : 0;
    const fill = document.getElementById("limit-fill");
    fill.style.width = `${pct}%`;
    if (data.limitReached) {
      fill.classList.add("full");
      document.getElementById("limit-note").textContent =
        "⚠️ Monthly limit reached. You cannot bid for more featured slots this month.";
      document.getElementById("place-bid-btn").disabled = true;
    }
  } catch (err) {
    console.error("Failed to load monthly limit:", err);
  }
}

// ===== Place Bid =====
async function placeBid(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("bid-amount").value);
  if (!amount || amount <= 0) {
    showAlert("Please enter a valid positive amount.", "error");
    return;
  }

  setBtnLoading("place-bid-btn", true);
  try {
    await apiFetch("/bids", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
    showAlert("Bid placed successfully! 🎉", "success");
    document.getElementById("bid-amount").value = "";
    loadBidStatus();
  } catch (err) {
    showAlert(
      err.data?.error || err.data?.errors?.[0]?.msg || "Failed to place bid.",
      "error"
    );
  } finally {
    setBtnLoading("place-bid-btn", false);
  }
}

// ===== Update Bid =====
async function updateBid(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("update-amount").value);
  if (!amount || amount <= 0) {
    showAlert("Please enter a valid positive amount.", "error");
    return;
  }

  setBtnLoading("update-bid-btn", true);
  try {
    await apiFetch("/bids", {
      method: "PUT",
      body: JSON.stringify({ amount }),
    });
    showAlert("Bid updated successfully! 📈", "success");
    document.getElementById("update-amount").value = "";
    loadBidStatus();
  } catch (err) {
    showAlert(
      err.data?.error || err.data?.errors?.[0]?.msg || "Failed to update bid.",
      "error"
    );
  } finally {
    setBtnLoading("update-bid-btn", false);
  }
}

// ===== Load Featured Alumnus =====
async function loadFeatured() {
  try {
    // Try without API key first (it will fail if key is required)
    const data = await apiFetch("/public/featured", {
      headers: { "x-api-key": localStorage.getItem("alumni_dev_api_key") || "" },
    });

    document.getElementById("featured-loading").classList.add("hidden");
    document.getElementById("featured-display").classList.remove("hidden");

    const p = data.personal || {};
    const prof = data.profile || {};

    document.getElementById("featured-display").innerHTML = `
      <div class="featured-profile">
        <div class="featured-avatar">
          ${prof.profile_image_url
            ? `<img src="${prof.profile_image_url}" alt="${p.firstName}" />`
            : `<span>${(p.firstName || "?")[0]}</span>`
          }
        </div>
        <div class="featured-info">
          <h3>${escapeHtml(p.firstName || "")} ${escapeHtml(p.lastName || "")}</h3>
          <p class="text-muted text-sm">${escapeHtml(p.email || "")}</p>
          ${prof.bio ? `<p class="text-sm mt-8">${escapeHtml(prof.bio)}</p>` : ""}
          ${prof.linkedin_url ? `<a href="${prof.linkedin_url}" target="_blank" class="text-sm mt-8">🔗 LinkedIn Profile</a>` : ""}
        </div>
      </div>
      <div class="featured-details">
        ${renderDetailGroup("🎓 Degrees", data.degrees, (d) => d.degree_name)}
        ${renderDetailGroup("📜 Certifications", data.certifications, (c) => c.cert_name)}
        ${renderDetailGroup("🪪 Licences", data.licences, (l) => l.licence_name)}
        ${renderDetailGroup("📚 Courses", data.courses, (c) => c.course_name)}
        ${renderDetailGroup("💼 Employment", data.employment, (e) => `${e.role} at ${e.company_name}`)}
      </div>
    `;
  } catch (err) {
    document.getElementById("featured-loading").classList.add("hidden");
    if (err.status === 404) {
      document.getElementById("featured-empty").classList.remove("hidden");
    } else {
      document.getElementById("featured-display").classList.remove("hidden");
      document.getElementById("featured-display").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔑</div>
          <p>Could not load featured alumnus. An API key may be required.</p>
          <p class="text-xs text-muted mt-8">Generate one via the Developer page with "mobile_ar" or "general" client type.</p>
        </div>
      `;
    }
  }
}

function renderDetailGroup(title, items, labelFn) {
  if (!items || items.length === 0) return "";
  return `
    <div class="featured-detail-group">
      <h4>${title}</h4>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(labelFn(item) || "—")}</li>`).join("")}
      </ul>
    </div>
  `;
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
  div.textContent = str;
  return div.innerHTML;
}

// ===== Init =====
loadBidStatus();
loadMonthlyLimit();
loadFeatured();
