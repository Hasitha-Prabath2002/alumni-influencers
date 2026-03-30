const pool = require("../config/db");

const verifyApiKey = async (req, res, next) => {
  const apiKey = req.header("x-api-key");

  if (!apiKey) {
    return res
      .status(401)
      .json({
        error:
          "API Key missing. Access denied. Please provide x-api-key header.",
      });
  }

  try {
    const connection = await pool.getConnection();
    const [keys] = await connection.query(
      "SELECT * FROM api_keys WHERE api_key = ? AND is_revoked = FALSE",
      [apiKey],
    );

    if (keys.length === 0) {
      connection.release();
      return res.status(401).json({ error: "Invalid or revoked API Key." });
    }

    // Log the usage
    await connection.query(
      "INSERT INTO api_usage_logs (api_key_id, endpoint, method, ip_address) VALUES (?, ?, ?, ?)",
      [keys[0].id, req.originalUrl, req.method, req.ip],
    );

    connection.release();
    next();
  } catch (error) {
    res.status(500).json({ error: "Database error verifying API Key" });
  }
};

module.exports = { verifyApiKey };
