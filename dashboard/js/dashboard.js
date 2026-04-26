/* ===== CHART DEFAULTS ===== */
Chart.defaults.color = "#64748b";
Chart.defaults.font.family = "Inter";
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.tooltip.backgroundColor = "rgba(13,13,30,0.95)";
Chart.defaults.plugins.tooltip.borderColor = "rgba(99,102,241,0.3)";
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 12;

const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#a855f7",
  "#14b8a6",
  "#f97316",
];

const GRID = { color: "rgba(255,255,255,0.05)", drawBorder: false };

/* ===== STATE ===== */
let charts = {};
let alumniPage = 1;
let alumniFiltersTimer = null;

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;

  // Populate user info
  const user = Auth.getUser();
  document.getElementById("user-name").textContent =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  document.getElementById("user-role").textContent = user.role || "analyst";
  document.getElementById("user-avatar").textContent = (user.firstName ||
    "U")[0].toUpperCase();

  // Sidebar navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      navigateTo(section);
    });
  });

  await loadSection("overview");
});

/* ===== NAVIGATION ===== */
async function navigateTo(section) {
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document
    .querySelector(`[data-section="${section}"]`)
    ?.classList.add("active");
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`section-${section}`)?.classList.add("active");

  const titles = {
    overview: "Dashboard Overview",
    charts: "Charts & Analytics",
    skills: "Skills Gap Intelligence",
    careers: "Career Pathways",
    alumni: "View Alumni",
    usage: "API Usage & Security",
  };
  document.getElementById("page-title").textContent =
    titles[section] || section;
  closeSidebar();

  await loadSection(section);
}

/* ===== SECTION LOADERS ===== */
async function loadSection(section) {
  showLoader(true);
  try {
    if (section === "overview") await loadOverview();
    else if (section === "charts") await loadChartsSection();
    else if (section === "skills") await loadSkillsGap();
    else if (section === "careers") await loadCareers();
    else if (section === "alumni") await loadAlumni();
    else if (section === "usage") await loadUsage();
  } catch (err) {
    console.error("Section load error:", err);
  } finally {
    showLoader(false);
  }
}

function showLoader(on) {
  document.getElementById("loading-overlay").classList.toggle("hidden", !on);
}

/* ===== OVERVIEW ===== */
async function loadOverview() {
  const [overview, profDev, programmes, graduation] = await Promise.all([
    apiFetch("/analytics/overview").catch(() => null),
    apiFetch("/analytics/professional-development").catch(() => null),
    apiFetch("/analytics/alumni-by-programme").catch(() => null),
    apiFetch("/analytics/alumni-by-graduation").catch(() => null),
  ]);

  if (overview) {
    setKPI("kpi-v-alumni", overview.totalAlumni);
    setKPI("kpi-v-certs", overview.totalCertifications);
    setKPI("kpi-v-courses", overview.totalCourses);
    setKPI("kpi-v-bids", overview.activeBidsToday);
    setKPI("kpi-v-degrees", overview.totalDegrees);
    const f = overview.alumnusOfTheDay;
    setKPI(
      "kpi-v-featured",
      f ? `${f.first_name} ${f.last_name}` : "No winner yet",
    );
  }

  // Doughnut: dev breakdown
  if (profDev) {
    const d = profDev.distribution;
    renderChart("breakdown", "doughnut", {
      labels: ["Certifications", "Courses", "Licences"],
      datasets: [
        {
          data: [d.certifications, d.courses, d.licences],
          backgroundColor: ["#6366f1", "#06b6d4", "#10b981"],
          borderWidth: 0,
        },
      ],
    });
  }

  // Bar: programmes
  if (programmes?.programmes?.length) {
    const top = programmes.programmes.slice(0, 8);
    renderChart(
      "programmes",
      "bar",
      {
        labels: top.map((p) => truncate(p.programme, 18)),
        datasets: [
          {
            label: "Alumni",
            data: top.map((p) => p.alumni_count),
            backgroundColor: PALETTE,
            borderRadius: 6,
          },
        ],
      },
      { indexAxis: "y", plugins: { legend: { display: false } } },
    );
  }

  // Line: graduation years
  if (graduation?.byYear?.length) {
    renderChart("graduation", "line", {
      labels: graduation.byYear.map((r) => r.graduation_year),
      datasets: [
        {
          label: "Graduates",
          data: graduation.byYear.map((r) => r.alumni_count),
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        },
      ],
    });
  }
}

/* ===== CHARTS SECTION ===== */
async function loadChartsSection() {
  const [trends, careers, industry, profDev] = await Promise.all([
    apiFetch("/analytics/certification-trends").catch(() => null),
    apiFetch("/analytics/career-pathways").catch(() => null),
    apiFetch("/analytics/alumni-by-industry").catch(() => null),
    apiFetch("/analytics/professional-development").catch(() => null),
  ]);

  // Line: cert trends
  if (trends) {
    const labels = [
      ...new Set([
        ...trends.certifications.map((r) => r.month),
        ...trends.courses.map((r) => r.month),
      ]),
    ].sort();
    const getCounts = (arr) =>
      labels.map((m) => arr.find((r) => r.month === m)?.count || 0);
    renderChart(
      "cert-trends",
      "line",
      {
        labels,
        datasets: [
          {
            label: "Certifications",
            data: getCounts(trends.certifications),
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.08)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Courses",
            data: getCounts(trends.courses),
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6,182,212,0.08)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Licences",
            data: getCounts(trends.licences),
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.08)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      { scales: { x: { grid: GRID }, y: { grid: GRID, beginAtZero: true } } },
    );
  }

  // Horizontal bar: top roles
  if (careers?.roles?.length) {
    const top = careers.roles.slice(0, 10);
    renderChart(
      "roles",
      "bar",
      {
        labels: top.map((r) => truncate(r.role, 22)),
        datasets: [
          {
            label: "Alumni",
            data: top.map((r) => r.count),
            backgroundColor: PALETTE,
            borderRadius: 4,
          },
        ],
      },
      {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: GRID, beginAtZero: true },
          y: { grid: { display: false } },
        },
      },
    );
  }

  // Pie: industry
  if (industry?.byCompany?.length) {
    const top = industry.byCompany.slice(0, 8);
    renderChart("industry", "pie", {
      labels: top.map((r) => truncate(r.sector, 16)),
      datasets: [
        {
          data: top.map((r) => r.count),
          backgroundColor: PALETTE,
          borderWidth: 0,
        },
      ],
    });
  }

  // Bar: top skills acquired
  if (profDev?.topSkills?.length) {
    const top = profDev.topSkills.slice(0, 12);
    renderChart(
      "skills-bar",
      "bar",
      {
        labels: top.map((s) => truncate(s.skill_name, 20)),
        datasets: [
          {
            label: "Alumni Count",
            data: top.map((s) => s.total_count),
            backgroundColor: PALETTE.map((c) => c + "cc"),
            borderColor: PALETTE,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      {
        scales: {
          x: { grid: { display: false } },
          y: { grid: GRID, beginAtZero: true },
        },
        plugins: { legend: { display: false } },
      },
    );
  }

  // Radar: averages
  if (profDev?.averages) {
    const a = profDev.averages;
    renderChart(
      "radar",
      "radar",
      {
        labels: ["Certifications", "Courses", "Licences"],
        datasets: [
          {
            label: "Avg per Alumnus",
            data: [
              a.certificationsPerAlumnus,
              a.coursesPerAlumnus,
              a.licencesPerAlumnus,
            ],
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.2)",
            pointBackgroundColor: "#6366f1",
          },
        ],
      },
      {
        scales: {
          r: {
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: { backdropColor: "transparent" },
          },
        },
      },
    );
  }
}

/* ===== SKILLS GAP ===== */
async function loadSkillsGap() {
  const data = await apiFetch("/analytics/skills-gap").catch(() => null);
  if (!data) return;

  // Bar: gap certs
  if (data.certifications?.length) {
    const top = data.certifications.slice(0, 12);
    const colors = top.map((s) =>
      s.severity === "critical"
        ? "#ef4444"
        : s.severity === "significant"
          ? "#f59e0b"
          : "#10b981",
    );
    renderChart(
      "gap-certs",
      "bar",
      {
        labels: top.map((s) => truncate(s.skill_name, 24)),
        datasets: [
          {
            label: "% of Graduates",
            data: top.map((s) => s.percentage),
            backgroundColor: colors.map((c) => c + "aa"),
            borderColor: colors,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      {
        scales: {
          x: { grid: { display: false } },
          y: { grid: GRID, beginAtZero: true, max: 100 },
        },
        plugins: { legend: { display: false } },
      },
    );
  }

  // Bar: gap courses
  if (data.courses?.length) {
    const top = data.courses.slice(0, 12);
    const colors = top.map((s) =>
      s.severity === "critical"
        ? "#ef4444"
        : s.severity === "significant"
          ? "#f59e0b"
          : "#10b981",
    );
    renderChart(
      "gap-courses",
      "bar",
      {
        labels: top.map((s) => truncate(s.skill_name, 24)),
        datasets: [
          {
            label: "% of Graduates",
            data: top.map((s) => s.percentage),
            backgroundColor: colors.map((c) => c + "aa"),
            borderColor: colors,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      {
        scales: {
          x: { grid: { display: false } },
          y: { grid: GRID, beginAtZero: true, max: 100 },
        },
        plugins: { legend: { display: false } },
      },
    );
  }

  // Table
  const all = [...(data.certifications || []), ...(data.courses || [])].sort(
    (a, b) => b.percentage - a.percentage,
  );
  const tbody = document.getElementById("gap-table-body");
  tbody.innerHTML =
    all
      .map(
        (s) => `
    <tr>
      <td><strong>${esc(s.skill_name)}</strong></td>
      <td>${esc(s.type)}</td>
      <td>${s.alumni_count}</td>
      <td>${s.percentage}%</td>
      <td><span class="severity-badge ${s.severity}">${s.severity}</span></td>
    </tr>`,
      )
      .join("") || '<tr><td colspan="5" class="loading-row">No data</td></tr>';
}

/* ===== CAREER PATHWAYS ===== */
async function loadCareers() {
  const data = await apiFetch("/analytics/career-pathways").catch(() => null);
  if (!data) return;

  // Area: employment timeline
  if (data.timeline?.length) {
    renderChart(
      "timeline",
      "line",
      {
        labels: data.timeline.map((r) => r.year),
        datasets: [
          {
            label: "Alumni Employed",
            data: data.timeline.map((r) => r.employed_count),
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.15)",
            fill: true,
            tension: 0.4,
            pointRadius: 5,
          },
        ],
      },
      { scales: { x: { grid: GRID }, y: { grid: GRID, beginAtZero: true } } },
    );
  }

  // Doughnut: top employers
  if (data.companies?.length) {
    const top = data.companies.slice(0, 8);
    renderChart("employers", "doughnut", {
      labels: top.map((c) => truncate(c.company_name, 18)),
      datasets: [
        {
          data: top.map((c) => c.count),
          backgroundColor: PALETTE,
          borderWidth: 0,
        },
      ],
    });
  }

  // Polar area: top roles
  if (data.roles?.length) {
    const top = data.roles.slice(0, 8);
    renderChart(
      "polar",
      "polarArea",
      {
        labels: top.map((r) => truncate(r.role, 20)),
        datasets: [
          {
            data: top.map((r) => r.count),
            backgroundColor: PALETTE.map((c) => c + "99"),
            borderColor: PALETTE,
            borderWidth: 1,
          },
        ],
      },
      {
        scales: {
          r: {
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: { backdropColor: "transparent" },
          },
        },
      },
    );
  }
}

/* ===== ALUMNI LIST ===== */
async function loadAlumni(page = 1) {
  alumniPage = page;
  const programme = document.getElementById("filter-programme").value;
  const year = document.getElementById("filter-year").value;
  const industry = document.getElementById("filter-industry").value;
  const params = new URLSearchParams({
    page,
    limit: 12,
    ...(programme && { programme }),
    ...(year && { year }),
    ...(industry && { industry }),
  });

  const data = await apiFetch(`/analytics/alumni?${params}`).catch(() => null);
  const grid = document.getElementById("alumni-grid");
  const pgn = document.getElementById("alumni-pagination");

  if (!data?.alumni?.length) {
    grid.innerHTML =
      '<div class="loading-placeholder">No alumni found for current filters.</div>';
    pgn.innerHTML = "";
    return;
  }

  grid.innerHTML = data.alumni
    .map((a) => {
      const initials =
        `${(a.first_name || "?")[0]}${(a.last_name || "?")[0]}`.toUpperCase();
      return `<div class="alumni-card">
      <div class="alumni-header">
        ${a.profile_image_url ? `<img class="alumni-avatar" src="${esc(a.profile_image_url)}" alt="${esc(a.first_name)}" onerror="this.outerHTML='<div class=\\'alumni-avatar\\'>${initials}</div>'" />` : `<div class="alumni-avatar">${initials}</div>`}
        <div>
          <div class="alumni-name">${esc(a.first_name)} ${esc(a.last_name)}</div>
          <div class="alumni-email">${esc(a.email)}</div>
        </div>
      </div>
      <div class="alumni-meta">
        ${a.programme ? `<span class="alumni-tag">${esc(a.programme)}</span>` : ""}
        ${a.graduation_date ? `<span class="alumni-tag green">Class of ${new Date(a.graduation_date).getFullYear()}</span>` : ""}
        ${a.role ? `<span class="alumni-tag amber">${esc(a.role)}</span>` : ""}
        ${a.company_name ? `<span class="alumni-tag">${esc(a.company_name)}</span>` : ""}
      </div>
    </div>`;
    })
    .join("");

  // Pagination
  const { pages } = data.pagination;
  pgn.innerHTML = Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1)
    .map(
      (p) =>
        `<button class="page-btn ${p === page ? "active" : ""}" onclick="loadAlumni(${p})">${p}</button>`,
    )
    .join("");
}

function debounceAlumni() {
  clearTimeout(alumniFiltersTimer);
  alumniFiltersTimer = setTimeout(() => loadAlumni(1), 400);
}

function clearAlumniFilters() {
  ["filter-programme", "filter-year", "filter-industry"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  loadAlumni(1);
}

/* ===== EXPORT CSV ===== */
async function exportAlumniCSV() {
  const data = await apiFetch("/analytics/alumni?limit=1000").catch(() => null);
  if (!data?.alumni?.length) {
    alert("No data to export.");
    return;
  }

  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Programme",
    "Graduation",
    "Role",
    "Company",
  ];
  const rows = data.alumni.map((a) => [
    a.first_name,
    a.last_name,
    a.email,
    a.programme || "",
    a.graduation_date ? new Date(a.graduation_date).getFullYear() : "",
    a.role || "",
    a.company_name || "",
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadFile(csv, "alumni-export.csv", "text/csv");
}

/* ===== EXPORT PDF REPORT ===== */
async function exportReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFillColor(6, 6, 18);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(241, 245, 249);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("University Alumni Analytics Report", 20, 28);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    20,
    38,
  );

  // KPI summary
  const kvs = [
    ["Total Alumni", document.getElementById("kpi-v-alumni")?.textContent],
    ["Certifications", document.getElementById("kpi-v-certs")?.textContent],
    [
      "Courses Completed",
      document.getElementById("kpi-v-courses")?.textContent,
    ],
    ["Active Bids Today", document.getElementById("kpi-v-bids")?.textContent],
    ["Alumnus of Day", document.getElementById("kpi-v-featured")?.textContent],
  ];
  doc.setTextColor(241, 245, 249);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Key Metrics", 20, 52);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  kvs.forEach(([k, v], i) => {
    doc.setTextColor(100, 116, 139);
    doc.text(k + ":", 20, 62 + i * 8);
    doc.setTextColor(241, 245, 249);
    doc.text(v || "—", 80, 62 + i * 8);
  });

  // Screenshot chart
  const chartCanvas = document.getElementById("chart-breakdown");
  if (chartCanvas) {
    const img = chartCanvas.toDataURL("image/png");
    doc.text("Development Breakdown Chart", 20, 110);
    doc.addImage(img, "PNG", 20, 116, 80, 60);
  }

  doc.save(`alumni-analytics-report-${Date.now()}.pdf`);
}

/* ===== USAGE ===== */
async function loadUsage() {
  const data = await apiFetch("/analytics/usage-stats").catch(() => null);
  if (!data) return;

  // Line: daily requests
  if (data.dailyRequests?.length) {
    renderChart(
      "daily-requests",
      "line",
      {
        labels: data.dailyRequests.map((r) => r.date),
        datasets: [
          {
            label: "API Requests",
            data: data.dailyRequests.map((r) => r.request_count),
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6,182,212,0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      { scales: { x: { grid: GRID }, y: { grid: GRID, beginAtZero: true } } },
    );
  }

  // Usage table
  const uBody = document.getElementById("usage-table-body");
  uBody.innerHTML =
    (data.endpointStats || [])
      .map(
        (s) => `<tr>
    <td><code>${esc(s.endpoint)}</code></td>
    <td><span class="client-badge analytics">${esc(s.method)}</span></td>
    <td>${s.hit_count}</td>
    <td>${s.last_accessed ? new Date(s.last_accessed).toLocaleString() : "—"}</td>
  </tr>`,
      )
      .join("") || '<tr><td colspan="4" class="loading-row">No data</td></tr>';

  // Key table
  const kBody = document.getElementById("key-table-body");
  kBody.innerHTML =
    (data.keyUsage || [])
      .map((k) => {
        const perms = (() => {
          try {
            return JSON.parse(k.permissions || "[]");
          } catch {
            return [];
          }
        })();
        return `<tr>
      <td><strong>${esc(k.name)}</strong></td>
      <td><span class="client-badge ${k.client_type === "analytics_dashboard" ? "analytics" : "ar"}">${esc(k.client_type || "general")}</span></td>
      <td>${perms.map((p) => `<span class="perm-tag">${esc(p)}</span>`).join("")}</td>
      <td>${k.total_requests || 0}</td>
      <td>${k.last_used ? new Date(k.last_used).toLocaleString() : "Never"}</td>
      <td><span class="severity-badge ${k.is_revoked ? "critical" : "emerging"}">${k.is_revoked ? "Revoked" : "Active"}</span></td>
    </tr>`;
      })
      .join("") || '<tr><td colspan="6" class="loading-row">No data</td></tr>';
}

/* ===== CHART HELPER ===== */
function renderChart(id, type, data, extraOptions = {}) {
  const canvasId = `chart-${id}`;
  if (charts[id]) {
    charts[id].destroy();
  }
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: "easeOutQuart" },
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 16, usePointStyle: true },
        },
        tooltip: { mode: "index", intersect: false },
      },
      scales:
        type === "pie" ||
        type === "doughnut" ||
        type === "polarArea" ||
        type === "radar"
          ? {}
          : {
              x: { grid: GRID, ticks: { maxRotation: 45 } },
              y: { grid: GRID, beginAtZero: true },
            },
      ...extraOptions,
    },
  });
}

/* ===== API KEY MODAL ===== */
function showApiKeyModal() {
  document.getElementById("api-modal-backdrop").classList.remove("hidden");
  document.getElementById("api-modal").classList.remove("hidden");
  document.getElementById("api-key-input").value = CONFIG.API_KEY || "";
}
function closeApiKeyModal() {
  document.getElementById("api-modal-backdrop").classList.add("hidden");
  document.getElementById("api-modal").classList.add("hidden");
}
function saveApiKey() {
  const key = document.getElementById("api-key-input").value.trim();
  if (key) {
    localStorage.setItem("dashboard_api_key", key);
    location.reload();
  } else {
    alert("Please enter a valid API key.");
  }
}

/* ===== SIDEBAR ===== */
function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
}

/* ===== LOGOUT ===== */
function logout() {
  Auth.clearSession();
  window.location.href = "login.html";
}

/* ===== UTILS ===== */
function setKPI(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "—";
}
function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + "…" : str || "";
}
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function downloadFile(content, filename, mimeType) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([content], { type: mimeType })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}
