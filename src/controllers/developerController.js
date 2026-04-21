const crypto = require("crypto");
const { validationResult } = require("express-validator");
const pool = require("../config/db");

const generateApiKey = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name } = req.body;
  const apiKey = crypto.randomBytes(32).toString("hex");

  try {
    const connection = await pool.getConnection();
    await connection.query(
      "INSERT INTO api_keys (user_id, api_key, name) VALUES (?, ?, ?)",
      [req.user.id, apiKey, name],
    );
    connection.release();

    res.status(201).json({
      message: "API Key generated safely store it, it will not be shown again.",
      apiKey,
      name,
    });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

const getApiKeys = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    // Don't return full keys for security, just prefix or ID
    const [keys] = await connection.query(
      'SELECT id, name, is_revoked, created_at, CONCAT(SUBSTRING(api_key, 1, 8), "...") as key_prefix FROM api_keys WHERE user_id = ?',
      [req.user.id],
    );
    connection.release();
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

const revokeApiKey = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      "UPDATE api_keys SET is_revoked = TRUE WHERE id = ? AND user_id = ?",
      [id, req.user.id],
    );
    connection.release();

    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ error: "Key not found or you lack permission" });
    res.json({ message: "API Key revoked successfully." });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

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
      return res.status(404).json({ error: "Key not found" });
    }

    const [stats] = await connection.query(
      "SELECT endpoint, method, COUNT(*) as hit_count, MAX(timestamp) as last_used FROM api_usage_logs WHERE api_key_id = ? GROUP BY endpoint, method ORDER BY last_used DESC",
      [id],
    );

    connection.release();
    res.json({ keyName: keys[0].name, stats });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = { generateApiKey, getApiKeys, revokeApiKey, getKeyStats };
