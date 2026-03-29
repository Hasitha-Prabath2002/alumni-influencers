const express = require('express');
const { getTodayAlumnus } = require('../controllers/publicController');
const { verifyApiKey } = require('../middleware/clientApiKeyMiddleware');

const router = express.Router();

/**
 * @swagger
 * /public/featured:
 *   get:
 *     summary: Retrieve today's featured Alumnus influencer
 *     tags: [Public]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *         required: true
 *         description: Developer Client API Key for tracking access
 *     responses:
 *       200:
 *         description: Comprehensive featured alumnus profile data arrays
 *       404:
 *         description: No featured alumnus today found
 */
// Securing the AR target endpoint requiring header 'x-api-key'
router.get('/featured', verifyApiKey, getTodayAlumnus);

module.exports = router;
