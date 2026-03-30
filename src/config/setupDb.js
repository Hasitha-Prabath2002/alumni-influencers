const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  try {
    console.log('Connecting to MySQL to verify/create database...');
    // Create connection without selecting the database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    const dbName = process.env.DB_NAME || 'alumni_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' verified/created.`);

    // Switch to the newly created database
    await connection.changeUser({ database: dbName });

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        token_expires DATETIME,
        reset_token VARCHAR(255),
        reset_token_expires DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        user_id INT PRIMARY KEY,
        bio TEXT,
        linkedin_url VARCHAR(255),
        profile_image_url VARCHAR(255),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS degrees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        degree_name VARCHAR(255) NOT NULL,
        university_url VARCHAR(255) NOT NULL,
        completion_date DATE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    const tables = ['certifications', 'licences', 'courses'];
    for(const table of tables) {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          name VARCHAR(255) NOT NULL,
          url VARCHAR(255) NOT NULL,
          completion_date DATE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS employment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        company_name VARCHAR(255),
        role VARCHAR(255),
        start_date DATE,
        end_date DATE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        amount DECIMAL(10,2) NOT NULL,
        bid_date DATE NOT NULL,
        status ENUM('PENDING', 'WINNING', 'LOSING', 'WON') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS monthly_stats (
        user_id INT,
        month VARCHAR(7) NOT NULL,
        win_count INT DEFAULT 0,
        attended_event BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (user_id, month),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        api_key VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(100),
        is_revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS api_usage_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        api_key_id INT,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        ip_address VARCHAR(45),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables setup completely executed successfully.');
  } catch (error) {
    console.error('Error setting up database tables:', error);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  setupDatabase().then(() => process.exit());
}

module.exports = setupDatabase;
