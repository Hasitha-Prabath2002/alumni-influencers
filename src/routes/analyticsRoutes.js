const express = require('express');
const { requireScopedApiKey } = require('../middleware/scopedApiKeyMiddleware');
const {
  getOverview,
  getSkillsGap,
  getCareerPathways,
  getCertificationTrends,
  getAlumniByProgramme,
  getAlumniByGraduation,
  getAlumniByIndustry,
  getProfessionalDevelopment,
  getAlumniList,
  getUsageStats
} = require('../controllers/analyticsController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: University Analytics Dashboard - requires scoped API key with read:analytics or read:alumni permissions
 */

/**
 * @swagger
 * /analytics/overview:
 *   get:
 *     summary: High-level KPI overview (total alumni, certifications, today's winner)
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Overview statistics object
 *       401:
 *         description: Missing or invalid API key
 *       403:
 *         description: Insufficient permissions (requires read:analytics)
 */
router.get('/overview', requireScopedApiKey(['read:analytics']), getOverview);

/**
 * @swagger
 * /analytics/skills-gap:
 *   get:
 *     summary: Detect curriculum skills gaps from post-graduation learning data
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Skills gap data with severity classification (critical/significant/emerging)
 *       403:
 *         description: Insufficient permissions (requires read:analytics)
 */
router.get('/skills-gap', requireScopedApiKey(['read:analytics']), getSkillsGap);

/**
 * @swagger
 * /analytics/career-pathways:
 *   get:
 *     summary: Alumni career pathway distribution (roles, companies, timeline)
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Career pathway data
 *       403:
 *         description: Insufficient permissions (requires read:analytics)
 */
router.get('/career-pathways', requireScopedApiKey(['read:analytics']), getCareerPathways);

/**
 * @swagger
 * /analytics/certification-trends:
 *   get:
 *     summary: Month-by-month trend of post-graduation certifications and courses
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Monthly trend data for certifications, courses, licences
 */
router.get('/certification-trends', requireScopedApiKey(['read:analytics']), getCertificationTrends);

/**
 * @swagger
 * /analytics/alumni-by-programme:
 *   get:
 *     summary: Alumni grouped by degree programme
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Programme distribution data
 */
router.get('/alumni-by-programme', requireScopedApiKey(['read:alumni']), getAlumniByProgramme);

/**
 * @swagger
 * /analytics/alumni-by-graduation:
 *   get:
 *     summary: Alumni grouped by graduation year
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Graduation year distribution
 */
router.get('/alumni-by-graduation', requireScopedApiKey(['read:alumni']), getAlumniByGraduation);

/**
 * @swagger
 * /analytics/alumni-by-industry:
 *   get:
 *     summary: Alumni grouped by industry/sector (derived from employment)
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Industry sector distribution
 */
router.get('/alumni-by-industry', requireScopedApiKey(['read:alumni']), getAlumniByIndustry);

/**
 * @swagger
 * /analytics/professional-development:
 *   get:
 *     summary: Post-graduation professional development aggregates and trends
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Professional development aggregated data
 */
router.get('/professional-development', requireScopedApiKey(['read:analytics']), getProfessionalDevelopment);

/**
 * @swagger
 * /analytics/alumni:
 *   get:
 *     summary: Searchable/filterable alumni list with pagination
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: programme
 *         schema:
 *           type: string
 *         description: Filter by degree programme name
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by graduation year
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Filter by industry/company sector
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated alumni list
 */
router.get('/alumni', requireScopedApiKey(['read:alumni']), getAlumniList);

/**
 * @swagger
 * /analytics/usage-stats:
 *   get:
 *     summary: API usage statistics - endpoint hit counts, key usage, daily trends
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Comprehensive API usage statistics
 */
router.get('/usage-stats', requireScopedApiKey(['read:analytics']), getUsageStats);

module.exports = router;
