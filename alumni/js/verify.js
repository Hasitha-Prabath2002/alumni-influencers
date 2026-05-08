// ============================================================
// Alumni Portal — Email Verification
// ============================================================

(async function () {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    showError("No verification token provided in the URL.");
    return;
  }

  try {
    await apiFetch(`/auth/verify/${encodeURIComponent(token)}`);
    // Success
    document.getElementById("verify-status").classList.add("hidden");
    document.getElementById("verify-success").classList.remove("hidden");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 3000);
  } catch (err) {
    showError(err.data?.error || "Invalid or expired verification token.");
  }
})();

function showError(msg) {
  document.getElementById("verify-status").classList.add("hidden");
  document.getElementById("verify-error").classList.remove("hidden");
  document.getElementById("verify-error-msg").textContent = msg;
}
