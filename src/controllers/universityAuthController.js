const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const pool = require("../config/db");

/**
 * POST /api/university-auth/register
 * Register a university staff member (university domain email required)
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password, firstName, lastName } = req.body;

  try {
    const connection = await pool.getConnection();

    // Check if email already exists
    const [existing] = await connection.query(
      "SELECT id FROM university_users WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({ error: "Email already registered." });
    }

    // Bcrypt hash with 12 rounds for strong security
    const hashedPassword = await bcrypt.hash(password, 12);

    // Cryptographically secure verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await connection.query(
      `INSERT INTO university_users (email, password, first_name, last_name, verification_token, token_expires)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        email,
        hashedPassword,
        firstName,
        lastName,
        verificationToken,
        tokenExpires,
      ],
    );

    connection.release();

    // In production: send verification email. For dev, return token in response.
    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      // In production remove verificationToken from response - only send via email
      verificationToken,
      note: "Production: token is sent via email only. Never expose in response.",
    });
  } catch (error) {
    console.error("University register error:", error);
    res.status(500).json({ error: "Database error during registration" });
  }
};

/**
 * GET /api/university-auth/verify/:token
 * Verify university staff email with token
 */
const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query(
      "SELECT * FROM university_users WHERE verification_token = ? AND token_expires > NOW()",
      [token],
    );

    if (users.length === 0) {
      connection.release();
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token." });
    }

    await connection.query(
      "UPDATE university_users SET is_verified = TRUE, verification_token = NULL, token_expires = NULL WHERE id = ?",
      [users[0].id],
    );

    connection.release();
    res.json({
      message:
        "Email verified successfully. You can now log in to the Analytics Dashboard.",
    });
  } catch (error) {
    console.error("University email verify error:", error);
    res.status(500).json({ error: "Database error during email verification" });
  }
};

/**
 * POST /api/university-auth/login
 * Login and receive JWT bearer token for university dashboard
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query(
      "SELECT * FROM university_users WHERE email = ?",
      [email],
    );

    if (users.length === 0) {
      connection.release();
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const user = users[0];

    if (!user.is_verified) {
      connection.release();
      return res
        .status(403)
        .json({ error: "Email not verified. Please check your inbox." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      connection.release();
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Update last login timestamp
    await connection.query(
      "UPDATE university_users SET last_login = NOW() WHERE id = ?",
      [user.id],
    );

    connection.release();

    // Generate JWT with role info
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        type: "university_staff",
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("University login error:", error);
    res.status(500).json({ error: "Database error during login" });
  }
};

/**
 * POST /api/university-auth/password-reset-request
 * Request a password reset token via email
 */
const requestPasswordReset = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;

  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query(
      "SELECT id FROM university_users WHERE email = ?",
      [email],
    );

    // Always return success to avoid email enumeration attacks
    if (users.length === 0) {
      connection.release();
      return res.json({
        message: "If this email exists, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await connection.query(
      "UPDATE university_users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
      [resetToken, resetExpires, users[0].id],
    );

    connection.release();

    // In production: send email with reset link
    res.json({
      message: "If this email exists, a reset link has been sent.",
      resetToken, // Only for dev/demo - remove in production
    });
  } catch (error) {
    console.error("University password reset request error:", error);
    res.status(500).json({ error: "Database error" });
  }
};

/**
 * POST /api/university-auth/password-reset
 * Consume reset token and update password
 */
const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { token, newPassword } = req.body;

  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query(
      "SELECT * FROM university_users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token],
    );

    if (users.length === 0) {
      connection.release();
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await connection.query(
      "UPDATE university_users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [hashedPassword, users[0].id],
    );

    connection.release();
    res.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("University password reset error:", error);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  requestPasswordReset,
  resetPassword,
};
