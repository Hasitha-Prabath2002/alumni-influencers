const express = require("express");
const { body } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  generateApiKey,
  getApiKeys,
  revokeApiKey,
  getKeyStats,
} = require("../controllers/developerController");

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Developer
 *   description: AR Client API Key management and token tracking
 */

/**
 * @swagger
 * /developer/keys:
 *   post:
 *     summary: Generate a new AR Client API Key
 *     tags: [Developer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Identifier for the API key client
 *     responses:
 *       201:
 *         description: Safely returns raw API key just once
 */
router.post(
  "/keys",
  [
    body("name").trim().notEmpty().withMessage("Key name is required").escape(),
    body("clientType")
      .optional()
      .isIn(["analytics_dashboard", "mobile_ar", "general"])
      .withMessage(
        "clientType must be: analytics_dashboard, mobile_ar, or general",
      ),
  ],
  generateApiKey,
);

/**
 * @swagger
 * /developer/keys:
 *   get:
 *     summary: List all active and revoked API keys for the current dev
 *     tags: [Developer]
 *     responses:
 *       200:
 *         description: List of API keys with only prefixes shown securely
 */
router.get("/keys", getApiKeys);

/**
 * @swagger
 * /developer/keys/{id}:
 *   delete:
 *     summary: Revoke access for an active API Key
 *     tags: [Developer]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: API Key revoked completely
 */
router.delete("/keys/:id", revokeApiKey);

/**
 * @swagger
 * /developer/keys/{id}/stats:
 *   get:
 *     summary: View endpoint usage metrics & timestamps for a Key
 *     tags: [Developer]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Analytics object grouping timestamp and hit counts
 */
router.get("/keys/:id/stats", getKeyStats);

module.exports = router;
