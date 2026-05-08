// ============================================================
// Alumni Portal — Password Reset Logic
// ============================================================

// Pre-fill token from URL if provided
const urlToken = new URLSearchParams(window.location.search).get("token");
if (urlToken) {
  document.getElementById("reset-token").value = urlToken;
}

// Password strength meter
document.getElementById("reset-password").addEventListener("input", function () {
  const val = this.value;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const fill = document.getElementById("pw-fill");
  const colors = ["#ef4444", "#f59e0b", "#10b981", "#6366f1"];
  const widths = ["25%", "50%", "75%", "100%"];
  fill.style.width = score ? widths[score - 1] : "0";
  fill.style.background = score ? colors[score - 1] : "";
});

// Toggle password visibility
function togglePw() {
  const input = document.getElementById("reset-password");
  const btn = input.nextElementSibling;
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
  } else {
    input.type = "password";
    btn.textContent = "👁";
  }
}

// Submit handler
document.getElementById("reset-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = document.getElementById("reset-token").value.trim();
  const newPassword = document.getElementById("reset-password").value;

  if (!token || !newPassword) {
    showAlert("Please fill in all fields.");
    return;
  }

  const btn = document.getElementById("reset-btn");
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".btn-spinner");
  btn.disabled = true;
  text.style.opacity = "0";
  spinner.classList.remove("hidden");

  try {
    await apiFetch("/auth/password-reset", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });

    document.getElementById("reset-form").classList.add("hidden");
    document.getElementById("reset-success").classList.remove("hidden");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2500);
  } catch (err) {
    showAlert(
      err.data?.error ||
        err.data?.errors?.[0]?.msg ||
        "Password reset failed."
    );
  } finally {
    btn.disabled = false;
    text.style.opacity = "1";
    spinner.classList.add("hidden");
  }
});

function showAlert(msg, type = "error") {
  const box = document.getElementById("alert-box");
  const msgEl = document.getElementById("alert-message");
  box.className = `alert ${type}`;
  msgEl.textContent = msg;
}
