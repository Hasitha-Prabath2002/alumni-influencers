const cron = require("node-cron");
const pool = require("../config/db");

// Run every midnight (00:00)
cron.schedule("0 0 * * *", async () => {
  console.log("Automated midnight winner selection running...");
  const todayDateStr = new Date().toISOString().split("T")[0];

  try {
    const connection = await pool.getConnection();

    // End all pending bids for today
    const [bids] = await connection.query(
      'SELECT * FROM bids WHERE bid_date = ? AND status = "PENDING" ORDER BY amount DESC',
      [todayDateStr],
    );

    if (bids.length > 0) {
      const winnerId = bids[0].user_id;
      const winnerBidId = bids[0].id;

      // Update winner
      await connection.query('UPDATE bids SET status = "WON" WHERE id = ?', [
        winnerBidId,
      ]);

      // Update losers
      await connection.query(
        'UPDATE bids SET status = "LOSING" WHERE bid_date = ? AND id != ? AND status = "PENDING"',
        [todayDateStr, winnerBidId],
      );

      // Track win in monthly stats
      const monthStr = todayDateStr.substring(0, 7);

      // Upsert stats
      await connection.query(
        `
        INSERT INTO monthly_stats (user_id, month, win_count) 
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE win_count = win_count + 1
      `,
        [winnerId, monthStr],
      );

      console.log(
        `Winning bid assigned to user ${winnerId} for ${todayDateStr}`,
      );

      // Notify winner
      const [user] = await connection.query(
        "SELECT first_name, email FROM users WHERE id = ?",
        [winnerId],
      );
      if (user.length > 0) {
        console.log(
          `[EMAIL MOCK] Sending email to ${user[0].email}: Congratulations ${user[0].first_name}! You won the bid for ${todayDateStr} and are the exclusive Alumni of the Day!`,
        );
      }
    } else {
      console.log(`No active bids found for ${todayDateStr}`);
    }

    connection.release();
  } catch (error) {
    console.error("Error during automated winner selection:", error);
  }
});
