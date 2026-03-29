const app = require('./app');
const pool = require('./config/db');
require('dotenv').config();
require('./utils/cronJobs'); // Schedule automation tasks

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err);
  }
});
