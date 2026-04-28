const crypto = require("crypto");
const { validationResult } = require("express-validator");
const pool = require("../config/db");

/**
 * Predefined permission sets for each client type.
 * This enforces the scoping rules from the coursework specification.
 *
 * Analytics Dashboard: read:alumni, read:analytics
 * Mobile AR App:       read:alumni_of_the_day  (cannot access analytics endpoints)
 * General:            read:alumni              (basic public data only)
 */
const CLIENT_PERMISSION_MAP = {
  analytics_dashboard: ["read:alumni", "read:analytics"],
  mobile_ar: ["read:alumni_of_the_day"],
  general: ["read:alumni"],
};

/**
 * POST /api/developer/keys
 * Generate a new scoped API key for a specified client type.
 * The permissions are automatically set based on the client_type.
 */
const generateApiKey = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, clientType = "general" } = req.body;

  // Validate client type
  if (!CLIENT_PERMISSION_MAP[clientType]) {
    return res.status(400).json({
      error: `Invalid client_type. Must be one of: ${Object.keys(CLIENT_PERMISSION_MAP).join(", ")}`,
    });
  }

  // Auto-assign permissions based on client type (scoping enforcement)
  const permissions = CLIENT_PERMISSION_MAP[clientType];

  // Cryptographically secure 64-hex-char API key
  const apiKey = crypto.randomBytes(32).toString("hex");

  try {
    const connection = await pool.getConnection();
    await connection.query(
      "INSERT INTO api_keys (user_id, api_key, name, client_type, permissions) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, apiKey, name, clientType, JSON.stringify(permissions)],
    );
    connection.release();

    res.status(201).json({
      message:
        "API Key generated. Store it securely — it will not be shown again.",
      apiKey,
      name,
      clientType,
      permissions,
      warning:
        "This key is scoped to its client type. Sharing keys between client applications is a security violation.",
    });
  } catch (error) {
    console.error("Generate API key error:", error);
    res.status(500).json({ error: "Database error generating API key" });
  }
};

/**
 * GET /api/developer/keys
 * List all active and revoked keys for the authenticated user (partial keys shown for security)
 */
const getApiKeys = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [keys] = await connection.query(
      `SELECT 
        id, name, client_type, permissions, is_revoked, created_at,
        CONCAT(SUBSTRING(api_key, 1, 8), '...') as key_prefix
       FROM api_keys WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
    );
    connection.release();

    // Parse permissions JSON for each key
    const enrichedKeys = keys.map((k) => ({
      ...k,
      permissions: (() => {
        try {
          return JSON.parse(k.permissions || "[]");
        } catch {
          return [];
        }
      })(),
    }));

    res.json(enrichedKeys);
  } catch (error) {
    console.error("Get API keys error:", error);
    res.status(500).json({ error: "Database error fetching API keys" });
  }
};

/**
 * DELETE /api/developer/keys/:id
 * Revoke an active API key (cannot be undone)
 */
const revokeApiKey = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      "UPDATE api_keys SET is_revoked = TRUE WHERE id = ? AND user_id = ?",
      [id, req.user.id],
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Key not found or you lack permission to revoke it." });
    }
    res.json({ message: "API Key revoked successfully." });
  } catch (error) {
    console.error("Revoke API key error:", error);
    res.status(500).json({ error: "Database error revoking API key" });
  }
};

/**
 * GET /api/developer/keys/:id/stats
 * View endpoint usage metrics and timestamps for a specific API key
 */
const getKeyStats = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();

    // Verify ownership
    const [keys] = await connection.query(
      "SELECT * FROM api_keys WHERE id = ? AND user_id = ?",
      [id, req.user.id],
    );
    if (keys.length === 0) {
      connection.release();
      return res.status(404).json({ error: "API Key not found." });
    }

    // Endpoint usage grouped by endpoint and method
    const [stats] = await connection.query(
      `SELECT 
         endpoint, method,
         COUNT(*) as hit_count,
         MIN(timestamp) as first_used,
         MAX(timestamp) as last_used
       FROM api_usage_logs
       WHERE api_key_id = ?
       GROUP BY endpoint, method
       ORDER BY last_used DESC`,
      [id],
    );

    // All timestamps for this key (most recent 50)
    const [recentLogs] = await connection.query(
      `SELECT endpoint, method, ip_address, timestamp
       FROM api_usage_logs
       WHERE api_key_id = ?
       ORDER BY timestamp DESC
       LIMIT 50`,
      [id],
    );

    connection.release();

    res.json({
      keyName: keys[0].name,
      clientType: keys[0].client_type,
      permissions: (() => {
        try {
          return JSON.parse(keys[0].permissions || "[]");
        } catch {
          return [];
        }
      })(),
      isRevoked: keys[0].is_revoked,
      createdAt: keys[0].created_at,
      usageSummary: stats,
      recentActivity: recentLogs,
    });
  } catch (error) {
    console.error("Get key stats error:", error);
    res.status(500).json({ error: "Database error fetching key statistics" });
  }
};

module.exports = { generateApiKey, getApiKeys, revokeApiKey, getKeyStats };
