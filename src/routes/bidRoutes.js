const express = require("express");
const { body } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  placeBid,
  updateBid,
  getBidStatus,
  getMonthlyStatus,
} = require("../controllers/bidController");

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Bids
 *   description: Blind bidding mechanics and limit tracking
 */

/**
 * @swagger
 * /bids:
 *   post:
 *     summary: Place a bid for next day's featured slot
 *     tags: [Bids]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bid placed successfully.
 *       400:
 *         description: Bid already placed or validation failed.
 *       403:
 *         description: Monthly winning limit reached.
 */
router.post(
  "/",
  [
    body("amount")
      .isNumeric()
      .custom((value) => value > 0)
      .withMessage("Bid amount must be positive")
      .escape(),
  ],
  placeBid,
);

/**
 * @swagger
 * /bids:
 *   put:
 *     summary: Update an existing bid amount (Increase Only)
 *     tags: [Bids]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Must be higher than current bid.
 *     responses:
 *       200:
 *         description: Bid updated successfully.
 *       400:
 *         description: New amount is lower/equal to current amount.
 */
router.put(
  "/",
  [
    body("amount")
      .isNumeric()
      .custom((value) => value > 0)
      .withMessage("Increase bid correctly")
      .escape(),
  ],
  updateBid,
);

/**
 * @swagger
 * /bids/status:
 *   get:
 *     summary: Check current blind bidding status
 *     tags: [Bids]
 *     responses:
 *       200:
 *         description: Returns NO_BID, CURRENTLY_WINNING, or LOSING
 */
router.get("/status", getBidStatus);

/**
 * @swagger
 * /bids/monthly-limit:
 *   get:
 *     summary: Get user's monthly win count and limit
 *     tags: [Bids]
 *     responses:
 *       200:
 *         description: Returns win count and limit exhaustion tracking
 */
router.get("/monthly-limit", getMonthlyStatus);

module.exports = router;
