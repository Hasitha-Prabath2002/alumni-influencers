const pool = require("../config/db");
const { validationResult } = require("express-validator");

const placeBid = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { amount } = req.body;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const bidDateStr = tomorrow.toISOString().split("T")[0];

  try {
    const connection = await pool.getConnection();

    // Check monthly limit (max 3/month)
    const monthStr = bidDateStr.substring(0, 7);
    const [stats] = await connection.query(
      "SELECT * FROM monthly_stats WHERE user_id = ? AND month = ?",
      [req.user.id, monthStr],
    );

    let maxWins = 3;
    if (stats.length > 0 && stats[0].attended_event) maxWins = 4;

    if (stats.length > 0 && stats[0].win_count >= maxWins) {
      connection.release();
      return res.status(403).json({ error: "Monthly winning limit reached." });
    }

    // Check existing bid
    const [existing] = await connection.query(
      "SELECT * FROM bids WHERE user_id = ? AND bid_date = ?",
      [req.user.id, bidDateStr],
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({
        error: "Bid already placed for tomorrow, Use update to increase.",
      });
    }

    await connection.query(
      "INSERT INTO bids (user_id, amount, bid_date, status) VALUES (?, ?, ?, ?)",
      [req.user.id, amount, bidDateStr, "PENDING"],
    );

    connection.release();
    res.status(201).json({ message: "Bid placed successfully." });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

const updateBid = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { amount } = req.body;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const bidDateStr = tomorrow.toISOString().split("T")[0];

  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.query(
      "SELECT * FROM bids WHERE user_id = ? AND bid_date = ?",
      [req.user.id, bidDateStr],
    );

    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: "No bid exists for tomorrow." });
    }

    if (amount <= existing[0].amount) {
      connection.release();
      return res
        .status(400)
        .json({ error: "New amount must be higher than current amount." });
    }

    await connection.query(
      "UPDATE bids SET amount = ? WHERE user_id = ? AND bid_date = ?",
      [amount, req.user.id, bidDateStr],
    );
    connection.release();
    res.json({ message: "Bid updated successfully." });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

const getBidStatus = async (req, res) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const bidDateStr = tomorrow.toISOString().split("T")[0];

  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.query(
      "SELECT * FROM bids WHERE user_id = ? AND bid_date = ?",
      [req.user.id, bidDateStr],
    );

    if (existing.length === 0) {
      connection.release();
      return res.json({ status: "NO_BID" });
    }

    // Determine if currently winning (Blind bidding)
    const [highest] = await connection.query(
      "SELECT amount FROM bids WHERE bid_date = ? ORDER BY amount DESC LIMIT 1",
      [bidDateStr],
    );

    let isWinning = existing[0].amount >= highest[0].amount;
    connection.release();

    res.json({ status: isWinning ? "CURRENTLY_WINNING" : "LOSING" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

const getMonthlyStatus = async (req, res) => {
  const currentMonth = new Date().toISOString().split("T")[0].substring(0, 7);
  try {
    const connection = await pool.getConnection();
    const [stats] = await connection.query(
      "SELECT * FROM monthly_stats WHERE user_id = ? AND month = ?",
      [req.user.id, currentMonth],
    );
    connection.release();

    let winCount = stats.length > 0 ? stats[0].win_count : 0;
    let maxWins = stats.length > 0 && stats[0].attended_event ? 4 : 3;

    res.json({ winCount, maxWins, limitReached: winCount >= maxWins });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = { placeBid, updateBid, getBidStatus, getMonthlyStatus };
