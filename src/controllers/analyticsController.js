const pool = require("../config/db");

/**
 * GET /api/analytics/overview
 * High-level KPIs: total alumni, total certifications, active bids, featured today
 * Required permission: read:analytics
 */
const getOverview = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [[{ total_alumni }]] = await connection.query(
      "SELECT COUNT(*) as total_alumni FROM users WHERE is_verified = TRUE",
    );
    const [[{ total_certifications }]] = await connection.query(
      "SELECT COUNT(*) as total_certifications FROM certifications",
    );
    const [[{ total_courses }]] = await connection.query(
      "SELECT COUNT(*) as total_courses FROM courses",
    );
    const [[{ total_degrees }]] = await connection.query(
      "SELECT COUNT(*) as total_degrees FROM degrees",
    );
    const [[{ total_employment }]] = await connection.query(
      "SELECT COUNT(*) as total_employment FROM employment",
    );
    const [[{ total_licences }]] = await connection.query(
      "SELECT COUNT(*) as total_licences FROM licences",
    );

    // Alumnus of the day
    const today = new Date().toISOString().split("T")[0];
    const [todayWinner] = await connection.query(
      `SELECT u.first_name, u.last_name, u.email 
       FROM bids b JOIN users u ON b.user_id = u.id 
       WHERE b.bid_date = ? AND b.status = 'WON' LIMIT 1`,
      [today],
    );

    // Total active bids
    const [[{ active_bids }]] = await connection.query(
      "SELECT COUNT(*) as active_bids FROM bids WHERE bid_date = ? AND status = 'PENDING'",
      [today],
    );

    connection.release();

    res.json({
      totalAlumni: total_alumni,
      totalCertifications: total_certifications,
      totalCourses: total_courses,
      totalDegrees: total_degrees,
      totalEmployment: total_employment,
      totalLicences: total_licences,
      activeBidsToday: active_bids,
      alumnusOfTheDay: todayWinner[0] || null,
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ error: "Database error fetching overview" });
  }
};

/**
 * GET /api/analytics/skills-gap
 * Detects skills acquired post-graduation not in formal curriculum.
 * Groups certifications by name and counts how many alumni hold each.
 * Required permission: read:analytics
 */
const getSkillsGap = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [certificationCounts] = await connection.query(`
      SELECT 
        name as skill_name,
        COUNT(DISTINCT user_id) as alumni_count,
        ROUND(COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM users WHERE is_verified = TRUE), 1) as percentage,
        MIN(completion_date) as first_seen,
        MAX(completion_date) as last_seen
      FROM certifications
      GROUP BY name
      ORDER BY alumni_count DESC
      LIMIT 20
    `);

    const [courseCounts] = await connection.query(`
      SELECT 
        name as skill_name,
        COUNT(DISTINCT user_id) as alumni_count,
        ROUND(COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM users WHERE is_verified = TRUE), 1) as percentage
      FROM courses
      GROUP BY name
      ORDER BY alumni_count DESC
      LIMIT 20
    `);

    connection.release();

    // Classify gap severity
    const classify = (pct) => {
      if (pct >= 50) return "critical";
      if (pct >= 25) return "significant";
      return "emerging";
    };

    const enrichedCerts = certificationCounts.map((s) => ({
      ...s,
      type: "certification",
      severity: classify(s.percentage),
    }));

    const enrichedCourses = courseCounts.map((s) => ({
      ...s,
      type: "course",
      severity: classify(s.percentage),
    }));

    res.json({
      certifications: enrichedCerts,
      courses: enrichedCourses,
    });
  } catch (error) {
    console.error("Skills gap error:", error);
    res.status(500).json({ error: "Database error fetching skills gap data" });
  }
};

/**
 * GET /api/analytics/career-pathways
 * Shows industry/role distribution from employment records.
 * Required permission: read:analytics
 */
const getCareerPathways = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [roles] = await connection.query(`
      SELECT 
        role,
        COUNT(DISTINCT user_id) as count,
        ROUND(COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(DISTINCT user_id) FROM employment), 1) as percentage
      FROM employment
      WHERE role IS NOT NULL AND role != ''
      GROUP BY role
      ORDER BY count DESC
      LIMIT 15
    `);

    const [companies] = await connection.query(`
      SELECT 
        company_name,
        COUNT(DISTINCT user_id) as count
      FROM employment
      WHERE company_name IS NOT NULL AND company_name != ''
      GROUP BY company_name
      ORDER BY count DESC
      LIMIT 15
    `);

    // Graduation to first job timeline
    const [timeline] = await connection.query(`
      SELECT 
        YEAR(e.start_date) as year,
        COUNT(DISTINCT e.user_id) as employed_count
      FROM employment e
      WHERE e.start_date IS NOT NULL
      GROUP BY YEAR(e.start_date)
      ORDER BY year ASC
    `);

    connection.release();

    res.json({ roles, companies, timeline });
  } catch (error) {
    console.error("Career pathways error:", error);
    res.status(500).json({ error: "Database error fetching career pathways" });
  }
};

/**
 * GET /api/analytics/certification-trends
 * Month-by-month trend of certifications and courses being acquired.
 * Required permission: read:analytics
 */
const getCertificationTrends = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [certsByMonth] = await connection.query(`
      SELECT 
        DATE_FORMAT(completion_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM certifications
      WHERE completion_date IS NOT NULL
      GROUP BY month
      ORDER BY month ASC
      LIMIT 24
    `);

    const [coursesByMonth] = await connection.query(`
      SELECT 
        DATE_FORMAT(completion_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM courses
      WHERE completion_date IS NOT NULL
      GROUP BY month
      ORDER BY month ASC
      LIMIT 24
    `);

    const [licencesByMonth] = await connection.query(`
      SELECT 
        DATE_FORMAT(completion_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM licences
      WHERE completion_date IS NOT NULL
      GROUP BY month
      ORDER BY month ASC
      LIMIT 24
    `);

    connection.release();

    res.json({
      certifications: certsByMonth,
      courses: coursesByMonth,
      licences: licencesByMonth,
    });
  } catch (error) {
    console.error("Certification trends error:", error);
    res
      .status(500)
      .json({ error: "Database error fetching certification trends" });
  }
};

/**
 * GET /api/analytics/alumni-by-programme
 * View alumni grouped by degree programme.
 * Required permission: read:alumni
 */
const getAlumniByProgramme = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [programmes] = await connection.query(`
      SELECT 
        d.degree_name as programme,
        COUNT(DISTINCT d.user_id) as alumni_count,
        ROUND(COUNT(DISTINCT d.user_id) * 100.0 / (SELECT COUNT(*) FROM users WHERE is_verified = TRUE), 1) as percentage
      FROM degrees d
      GROUP BY d.degree_name
      ORDER BY alumni_count DESC
    `);

    connection.release();

    res.json({ programmes });
  } catch (error) {
    console.error("Alumni by programme error:", error);
    res
      .status(500)
      .json({ error: "Database error fetching alumni by programme" });
  }
};

/**
 * GET /api/analytics/alumni-by-graduation
 * View alumni count grouped by graduation year.
 * Required permission: read:alumni
 */
const getAlumniByGraduation = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [byYear] = await connection.query(`
      SELECT 
        YEAR(d.completion_date) as graduation_year,
        COUNT(DISTINCT d.user_id) as alumni_count
      FROM degrees d
      WHERE d.completion_date IS NOT NULL
      GROUP BY graduation_year
      ORDER BY graduation_year ASC
    `);

    connection.release();

    res.json({ byYear });
  } catch (error) {
    console.error("Alumni by graduation error:", error);
    res
      .status(500)
      .json({ error: "Database error fetching alumni by graduation" });
  }
};

/**
 * GET /api/analytics/alumni-by-industry
 * View alumni grouped by employment industry/sector (derived from role keywords).
 * Required permission: read:alumni
 */
const getAlumniByIndustry = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Group by company as a proxy for industry sector
    const [byCompany] = await connection.query(`
      SELECT 
        company_name as sector,
        COUNT(DISTINCT user_id) as count
      FROM employment
      WHERE company_name IS NOT NULL AND company_name != ''
      GROUP BY company_name
      ORDER BY count DESC
      LIMIT 20
    `);

    // Role distribution as secondary sector indicator
    const [byRole] = await connection.query(`
      SELECT 
        role as sector,
        COUNT(DISTINCT user_id) as count
      FROM employment
      WHERE role IS NOT NULL AND role != ''
      GROUP BY role
      ORDER BY count DESC
      LIMIT 20
    `);

    connection.release();

    res.json({ byCompany, byRole });
  } catch (error) {
    console.error("Alumni by industry error:", error);
    res
      .status(500)
      .json({ error: "Database error fetching alumni by industry" });
  }
};

/**
 * GET /api/analytics/professional-development
 * Aggregates all types of post-graduation learning (certifications, courses, licences).
 * Shows top professional development areas.
 * Required permission: read:analytics
 */
const getProfessionalDevelopment = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Combined top skills acquired
    const [topSkills] = await connection.query(`
      SELECT skill_name, SUM(cnt) as total_count FROM (
        SELECT name as skill_name, COUNT(*) as cnt FROM certifications GROUP BY name
        UNION ALL
        SELECT name as skill_name, COUNT(*) as cnt FROM courses GROUP BY name
        UNION ALL
        SELECT name as skill_name, COUNT(*) as cnt FROM licences GROUP BY name
      ) combined
      GROUP BY skill_name
      ORDER BY total_count DESC
      LIMIT 15
    `);

    // Per-alumnus development count
    const [[{ avg_certs }]] = await connection.query(
      "SELECT ROUND(AVG(cnt), 1) as avg_certs FROM (SELECT user_id, COUNT(*) as cnt FROM certifications GROUP BY user_id) t",
    );
    const [[{ avg_courses }]] = await connection.query(
      "SELECT ROUND(AVG(cnt), 1) as avg_courses FROM (SELECT user_id, COUNT(*) as cnt FROM courses GROUP BY user_id) t",
    );
    const [[{ avg_licences }]] = await connection.query(
      "SELECT ROUND(AVG(cnt), 1) as avg_licences FROM (SELECT user_id, COUNT(*) as cnt FROM licences GROUP BY user_id) t",
    );

    // Distribution breakdown
    const [[{ cert_total }]] = await connection.query(
      "SELECT COUNT(*) as cert_total FROM certifications",
    );
    const [[{ course_total }]] = await connection.query(
      "SELECT COUNT(*) as course_total FROM courses",
    );
    const [[{ licence_total }]] = await connection.query(
      "SELECT COUNT(*) as licence_total FROM licences",
    );

    connection.release();

    res.json({
      topSkills,
      averages: {
        certificationsPerAlumnus: avg_certs || 0,
        coursesPerAlumnus: avg_courses || 0,
        licencesPerAlumnus: avg_licences || 0,
      },
      distribution: {
        certifications: cert_total,
        courses: course_total,
        licences: licence_total,
      },
    });
  } catch (error) {
    console.error("Professional development error:", error);
    res
      .status(500)
      .json({ error: "Database error fetching professional development data" });
  }
};

/**
 * GET /api/analytics/alumni-list
 * Full searchable alumni listing with programme, graduation, and industry filters.
 * Required permission: read:alumni
 */
const getAlumniList = async (req, res) => {
  try {
    const { programme, year, industry, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const connection = await pool.getConnection();

    let query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.created_at,
        p.bio, p.linkedin_url, p.profile_image_url,
        d.degree_name as programme, d.completion_date as graduation_date,
        e.company_name, e.role
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN degrees d ON u.id = d.user_id
      LEFT JOIN employment e ON u.id = e.user_id
      WHERE u.is_verified = TRUE
    `;

    const params = [];

    if (programme) {
      query += " AND d.degree_name LIKE ?";
      params.push(`%${programme}%`);
    }
    if (year) {
      query += " AND YEAR(d.completion_date) = ?";
      params.push(parseInt(year));
    }
    if (industry) {
      query += " AND (e.company_name LIKE ? OR e.role LIKE ?)";
      params.push(`%${industry}%`, `%${industry}%`);
    }

    query += " GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [alumni] = await connection.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN degrees d ON u.id = d.user_id
      LEFT JOIN employment e ON u.id = e.user_id
      WHERE u.is_verified = TRUE
    `;
    const countParams = [];
    if (programme) {
      countQuery += " AND d.degree_name LIKE ?";
      countParams.push(`%${programme}%`);
    }
    if (year) {
      countQuery += " AND YEAR(d.completion_date) = ?";
      countParams.push(parseInt(year));
    }
    if (industry) {
      countQuery += " AND (e.company_name LIKE ? OR e.role LIKE ?)";
      countParams.push(`%${industry}%`, `%${industry}%`);
    }

    const [[{ total }]] = await connection.query(countQuery, countParams);
    connection.release();

    res.json({
      alumni,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Alumni list error:", error);
    res.status(500).json({ error: "Database error fetching alumni list" });
  }
};

/**
 * GET /api/analytics/usage-stats
 * Admin usage statistics - login counts, API key usage, endpoints accessed.
 * Required permission: read:analytics
 */
const getUsageStats = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // API key usage grouped by endpoint
    const [endpointStats] = await connection.query(`
      SELECT 
        l.endpoint,
        l.method,
        COUNT(*) as hit_count,
        COUNT(DISTINCT l.api_key_id) as unique_keys,
        MAX(l.timestamp) as last_accessed
      FROM api_usage_logs l
      GROUP BY l.endpoint, l.method
      ORDER BY hit_count DESC
      LIMIT 20
    `);

    // Per key usage summary
    const [keyUsage] = await connection.query(`
      SELECT 
        k.id,
        k.name,
        k.client_type,
        k.permissions,
        k.is_revoked,
        k.created_at,
        COUNT(l.id) as total_requests,
        MAX(l.timestamp) as last_used
      FROM api_keys k
      LEFT JOIN api_usage_logs l ON k.id = l.api_key_id
      GROUP BY k.id
      ORDER BY total_requests DESC
    `);

    // Daily request counts for last 30 days
    const [dailyRequests] = await connection.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as request_count
      FROM api_usage_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    connection.release();

    res.json({ endpointStats, keyUsage, dailyRequests });
  } catch (error) {
    console.error("Usage stats error:", error);
    res.status(500).json({ error: "Database error fetching usage stats" });
  }
};

module.exports = {
  getOverview,
  getSkillsGap,
  getCareerPathways,
  getCertificationTrends,
  getAlumniByProgramme,
  getAlumniByGraduation,
  getAlumniByIndustry,
  getProfessionalDevelopment,
  getAlumniList,
  getUsageStats,
};
