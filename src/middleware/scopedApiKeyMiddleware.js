const pool = require("../config/db");

/**
 * Scoped API Key Middleware
 * Validates the x-api-key header and enforces permission scoping.
 * Different client types (Analytics Dashboard, AR App) have different permission sets.
 *
 * @param {string[]} requiredPermissions - Array of required permissions e.g. ['read:alumni', 'read:analytics']
 */
const requireScopedApiKey = (requiredPermissions = []) => {
  return async (req, res, next) => {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
      return res.status(401).json({
        error:
          "API Key missing. Access denied. Please provide x-api-key header.",
      });
    }

    try {
      const connection = await pool.getConnection();

      // Fetch the key along with its scoped permissions
      const [keys] = await connection.query(
        "SELECT * FROM api_keys WHERE api_key = ? AND is_revoked = FALSE",
        [apiKey],
      );

      if (keys.length === 0) {
        connection.release();
        return res.status(401).json({ error: "Invalid or revoked API Key." });
      }

      const keyRecord = keys[0];

      // Parse stored permissions JSON array
      let grantedPermissions = [];
      try {
        grantedPermissions = JSON.parse(keyRecord.permissions || "[]");
      } catch {
        grantedPermissions = [];
      }

      // Check all required permissions are satisfied
      const missingPermissions = requiredPermissions.filter(
        (perm) => !grantedPermissions.includes(perm),
      );

      if (missingPermissions.length > 0) {
        connection.release();
        return res.status(403).json({
          error: "Insufficient permissions.",
          missing: missingPermissions,
          granted: grantedPermissions,
        });
      }

      // Log API usage for analytics
      await connection.query(
        "INSERT INTO api_usage_logs (api_key_id, endpoint, method, ip_address) VALUES (?, ?, ?, ?)",
        [keyRecord.id, req.originalUrl, req.method, req.ip],
      );

      connection.release();

      // Attach key info to request for downstream use
      req.apiKey = {
        id: keyRecord.id,
        name: keyRecord.name,
        clientType: keyRecord.client_type,
        permissions: grantedPermissions,
      };

      next();
    } catch (error) {
      console.error("API Key verification error:", error);
      res.status(500).json({ error: "Database error verifying API Key" });
    }
  };
};

module.exports = { requireScopedApiKey };
