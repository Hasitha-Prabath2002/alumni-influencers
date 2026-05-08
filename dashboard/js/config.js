// Central API config — update BASE_URL to your deployed server
const CONFIG = {
  BASE_URL: "http://localhost:3000/api",
  // Analytics Dashboard API key — generated via POST /api/developer/keys
  // with clientType: 'analytics_dashboard'
  // Store this after first run; for demo it's read from localStorage
  get API_KEY() {
    return localStorage.getItem("dashboard_api_key") || "";
  },
};

// Shared auth helpers
const Auth = {
  getToken: () => localStorage.getItem("university_token"),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem("university_user") || "{}");
    } catch {
      return {};
    }
  },
  setSession(token, user) {
    localStorage.setItem("university_token", token);
    localStorage.setItem("university_user", JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem("university_token");
    localStorage.removeItem("university_user");
  },
  isLoggedIn: () => !!localStorage.getItem("university_token"),
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  },
};

// Shared fetch wrapper with auth headers and API key
async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(Auth.getToken() ? { Authorization: `Bearer ${Auth.getToken()}` } : {}),
    ...(CONFIG.API_KEY ? { "x-api-key": CONFIG.API_KEY } : {}),
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
