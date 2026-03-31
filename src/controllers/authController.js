const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const pool = require("../config/db");
// Mocking email sending for simplicity, normally use nodemailer
const sendEmail = async (to, subject, text) => {
  console.log(`Sending email to ${to}: ${subject}\n${text}`);
};

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password, firstName, lastName } = req.body;

  try {
    const connection = await pool.getConnection();
    const [existingUser] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );
    if (existingUser.length > 0) {
      connection.release();
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 3600000); // 24 hours

    const [result] = await connection.query(
      "INSERT INTO users (email, password, first_name, last_name, verification_token, token_expires) VALUES (?, ?, ?, ?, ?, ?)",
      [email, hashedPassword, firstName, lastName, token, tokenExpires],
    );

    // Auto create profile
    await connection.query("INSERT INTO profiles (user_id) VALUES (?)", [
      result.insertId,
    ]);
    connection.release();

    await sendEmail(
      email,
      "Verify your email",
      `Use this token to verify: ${token}`,
    );

    res
      .status(201)
      .json({
        message: "Registration successful. Check your email for verification.",
      });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    const connection = await pool.getConnection();
    const [user] = await connection.query(
      "SELECT * FROM users WHERE verification_token = ? AND token_expires > NOW()",
      [token],
    );

    if (user.length === 0) {
      connection.release();
      return res.status(400).json({ error: "Invalid or expired token." });
    }

    await connection.query(
      "UPDATE users SET is_verified = TRUE, verification_token = NULL, token_expires = NULL WHERE id = ?",
      [user[0].id],
    );
    connection.release();

    res.json({ message: "Email verified successfully. You can now login." });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const connection = await pool.getConnection();
    const [user] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );
    connection.release();

    if (
      user.length === 0 ||
      !(await bcrypt.compare(password, user[0].password))
    ) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    if (!user[0].is_verified) {
      return res.status(403).json({ error: "Please verify your email first" });
    }

    const token = jwt.sign(
      { id: user[0].id, email: user[0].email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
    );

    res.json({ token, message: "Logged in successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const requestPasswordReset = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  try {
    const connection = await pool.getConnection();
    const [user] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );

    if (user.length === 0) {
      connection.release();
      // Always return success even if user not found for security (avoid enumerating emails)
      return res.json({
        message: "If the email exists, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await connection.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
      [resetToken, resetTokenExpires, user[0].id],
    );
    connection.release();

    await sendEmail(
      email,
      "Password Reset",
      `Use this token to reset your password: ${resetToken}`,
    );
    res.json({
      message: "If the email exists, a password reset link has been sent.",
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { token, newPassword } = req.body;
  try {
    const connection = await pool.getConnection();
    const [user] = await connection.query(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token],
    );

    if (user.length === 0) {
      connection.release();
      return res.status(400).json({ error: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await connection.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [hashedPassword, user[0].id],
    );
    connection.release();

    res.json({ message: "Password reset successful. You can now login." });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  requestPasswordReset,
  resetPassword,
};
