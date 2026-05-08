// ============================================================
// Alumni Portal — Shared Configuration & Auth Helpers
// ============================================================

const CONFIG = {
  BASE_URL: "http://localhost:3000/api",
};

// JWT Auth helpers using localStorage
const Auth = {
  getToken: () => localStorage.getItem("alumni_token"),
  setToken: (token) => localStorage.setItem("alumni_token", token),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem("alumni_user") || "{}");
    } catch {
      return {};
    }
  },
  setUser: (user) =>
    localStorage.setItem("alumni_user", JSON.stringify(user)),
  setSession(token, user) {
    this.setToken(token);
    if (user) this.setUser(user);
  },
  clearSession() {
    localStorage.removeItem("alumni_token");
    localStorage.removeItem("alumni_user");
  },
  isLoggedIn: () => !!localStorage.getItem("alumni_token"),
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  },
  /** Decode JWT payload (no verification — purely for display) */
  decodeToken() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  },
};

/**
 * Shared fetch wrapper that automatically attaches JWT bearer token.
 * Throws { status, data } on non-2xx responses.
 */
async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(Auth.getToken()
      ? { Authorization: `Bearer ${Auth.getToken()}` }
      : {}),
    ...(options.headers || {}),
  };

  const resp = await fetch(`${CONFIG.BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw { status: resp.status, data };
  return data;
}

// Logout helper — clears session and redirects
function logout() {
  Auth.clearSession();
  window.location.href = "login.html";
}
