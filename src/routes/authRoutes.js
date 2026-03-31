const express = require("express");
const { body } = require("express-validator");
const {
  register,
  verifyEmail,
  login,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registration, verification, logins, and passwords
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register an alumnus
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 description: Must be a university email (.edu)
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful, check email for verification
 */
router.post(
  "/register",
  [
    body("email")
      .isEmail()
      .withMessage("Enter a valid email")
      .matches(/^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*(edu|ac\.uk|ac\.lk)$/)
      .withMessage("Must be a valid university email")
      // .matches(/@.*\.edu(\.\w+)?$/)
      // .withMessage("Must be a university email (.edu)")
      .normalizeEmail(),
    body("password")
      .isStrongPassword()
      .withMessage(
        "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character",
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
 * /auth/verify/{token}:
 *   get:
 *     summary: Verify email via unique cryptographically generated token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully. You can now login.
 */
router.get("/verify/:token", verifyEmail);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Obtain JSON Web Token (JWT) using verified credentials
 *     tags: [Auth]
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
 *         description: JWT generated successfully
 */
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  login,
);

/**
 * @swagger
 * /auth/password-reset-request:
 *   post:
 *     summary: Request a reset token delivered via email
 *     tags: [Auth]
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
 *         description: Successfully processed email
 */
router.post(
  "/password-reset-request",
  [body("email").isEmail().normalizeEmail()],
  requestPasswordReset,
);

/**
 * @swagger
 * /auth/password-reset:
 *   post:
 *     summary: Consume the reset token yielding string replacement
 *     tags: [Auth]
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
 *         description: Password reset successful
 */
router.post(
  "/password-reset",
  [body("token").notEmpty(), body("newPassword").isStrongPassword()],
  resetPassword,
);

module.exports = router;
