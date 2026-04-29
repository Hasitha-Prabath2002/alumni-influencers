const express = require("express");
const { body } = require("express-validator");
const {
  register,
  verifyEmail,
  login,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/universityAuthController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: UniversityAuth
 *   description: University Analytics Dashboard staff authentication (university domain email required)
 */

/**
 * @swagger
 * /university-auth/register:
 *   post:
 *     summary: Register a university staff account for the Analytics Dashboard
 *     tags: [UniversityAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 description: Must be a university domain email (.edu or .ac.*)
 *               password:
 *                 type: string
 *                 description: Strong password (min 8 chars, uppercase, lowercase, number, symbol)
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful, check email for verification
 *       409:
 *         description: Email already registered
 */
router.post(
  "/register",
  [
    body("email")
      .isEmail()
      .withMessage("Enter a valid email")
      .matches(/(@.*\.(edu|ac\..+))$/)
      .withMessage("Must be a university domain email (.edu or .ac.*)")
      .normalizeEmail(),
    body("password")
      .isStrongPassword({
        minLength: 8,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      .withMessage(
        "Password must be at least 8 characters with uppercase, number and symbol",
      ),
    body("firstName")
      .trim()
      .escape()
      .notEmpty()
      .withMessage("First name required"),
    body("lastName")
      .trim()
      .escape()
      .notEmpty()
      .withMessage("Last name required"),
  ],
  register,
);

/**
 * @swagger
 * /university-auth/verify/{token}:
 *   get:
 *     summary: Verify university staff email via secure token
 *     tags: [UniversityAuth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get("/verify/:token", verifyEmail);

/**
 * @swagger
 * /university-auth/login:
 *   post:
 *     summary: Login to the Analytics Dashboard (returns JWT bearer token)
 *     tags: [UniversityAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, JWT token returned
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified
 */
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login,
);

/**
 * @swagger
 * /university-auth/password-reset-request:
 *   post:
 *     summary: Request a password reset link via email
 *     tags: [UniversityAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset link sent (if email exists)
 */
router.post(
  "/password-reset-request",
  [body("email").isEmail().normalizeEmail()],
  requestPasswordReset,
);

/**
 * @swagger
 * /university-auth/password-reset:
 *   post:
 *     summary: Reset password using secure single-use token
 *     tags: [UniversityAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  "/password-reset",
  [
    body("token").notEmpty(),
    body("newPassword")
      .isStrongPassword({
        minLength: 8,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      .withMessage(
        "Password must be strong (min 8 chars, uppercase, number, symbol)",
      ),
  ],
  resetPassword,
);

module.exports = router;
