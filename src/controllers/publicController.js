const pool = require('../config/db');

const getTodayAlumnus = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const connection = await pool.getConnection();

    // Get the winning bid for today
    const [winningBid] = await connection.query('SELECT user_id FROM bids WHERE bid_date = ? AND status = "WON" LIMIT 1', [today]);
    
    if (winningBid.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'No featured alumnus today.' });
    }

    const userId = winningBid[0].user_id;

    // Fetch comprehensive data
    const [user] = await connection.query('SELECT first_name, last_name, email FROM users WHERE id = ?', [userId]);
    const [profile] = await connection.query('SELECT bio, linkedin_url, profile_image_url FROM profiles WHERE user_id = ?', [userId]);
    const [degrees] = await connection.query('SELECT degree_name, university_url, completion_date FROM degrees WHERE user_id = ?', [userId]);
    const [certifications] = await connection.query('SELECT name as cert_name, url as course_url, completion_date FROM certifications WHERE user_id = ?', [userId]);
    const [courses] = await connection.query('SELECT name as course_name, url as course_url, completion_date FROM courses WHERE user_id = ?', [userId]);
    const [licences] = await connection.query('SELECT name as licence_name, url as body_url, completion_date FROM licences WHERE user_id = ?', [userId]);
    const [employment] = await connection.query('SELECT company_name, role, start_date, end_date FROM employment WHERE user_id = ?', [userId]);

    connection.release();

    res.json({
      personal: { firstName: user[0].first_name, lastName: user[0].last_name, email: user[0].email },
      profile: profile[0] || {},
      degrees,
      certifications,
      licences,
      courses,
      employment
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error fetching featured alumnus' });
  }
};

module.exports = { getTodayAlumnus };
