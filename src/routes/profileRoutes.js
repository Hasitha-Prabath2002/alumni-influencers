const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { 
  getProfile, updateProfile, 
  addDegree, getDegrees, deleteDegree,
  addCertification, getCertifications, deleteCertification,
  addLicence, getLicences, deleteLicence, 
  addCourse, getCourses, deleteCourse,
  addEmployment, getEmployment, deleteEmployment, 
  uploadProfileImage
} = require('../controllers/profileController');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: Comprehensive Alumni Profile management spanning arrays
 */

/**
 * @swagger
 * /profiles:
 *   get:
 *     summary: Retrieve comprehensive profile context
 *     tags: [Profiles]
 *     responses:
 *       200:
 *         description: Profile successfully retrieved
 */
router.get('/', getProfile);

/**
 * @swagger
 * /profiles:
 *   put:
 *     summary: Update basic bio and linkedin
 *     tags: [Profiles]
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/', [
  body('bio').optional().isString().trim().escape(),
  body('linkedinUrl').optional().isURL().trim()
], updateProfile);

/**
 * @swagger
 * /profiles/image:
 *   post:
 *     summary: Upload profile imagery (multipart/form-data)
 *     tags: [Profiles]
 *     responses:
 *       200:
 *         description: URL generated safely
 */
router.post('/image', upload.single('profileImage'), uploadProfileImage);

// Degrees
/**
 * @swagger
 * /profiles/degrees:
 *   get:
 *     summary: Get all degrees
 *     tags: [Profiles]
 *   post:
 *     summary: Add new degree
 *     tags: [Profiles]
 */
router.get('/degrees', getDegrees);
router.post('/degrees', [
  body('degreeName').notEmpty().trim().escape(),
  body('universityUrl').isURL().trim(),
  body('completionDate').isDate()
], addDegree);
router.delete('/degrees/:id', deleteDegree);

// Certifications
/**
 * @swagger
 * /profiles/certifications:
 *   get:
 *     summary: Get all certifications
 *     tags: [Profiles]
 *   post:
 *     summary: Add new certification
 *     tags: [Profiles]
 */
router.get('/certifications', getCertifications);
router.post('/certifications', [
  body('certName').notEmpty().trim().escape(),
  body('courseUrl').isURL().trim(),
  body('completionDate').isDate()
], addCertification);
router.delete('/certifications/:id', deleteCertification);

// Licences
/**
 * @swagger
 * /profiles/licences:
 *   get:
 *     summary: Get all licences
 *     tags: [Profiles]
 *   post:
 *     summary: Add new licence
 *     tags: [Profiles]
 */
router.get('/licences', getLicences);
router.post('/licences', [
  body('licenceName').notEmpty().trim().escape(),
  body('bodyUrl').isURL().trim(),
  body('completionDate').isDate()
], addLicence);
router.delete('/licences/:id', deleteLicence);

// Professional Courses
/**
 * @swagger
 * /profiles/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Profiles]
 *   post:
 *     summary: Add new course
 *     tags: [Profiles]
 */
router.get('/courses', getCourses);
router.post('/courses', [
  body('courseName').notEmpty().trim().escape(),
  body('courseUrl').isURL().trim(),
  body('completionDate').isDate()
], addCourse);
router.delete('/courses/:id', deleteCourse);

// Employment History
/**
 * @swagger
 * /profiles/employment:
 *   get:
 *     summary: Get employment history arrays
 *     tags: [Profiles]
 *   post:
 *     summary: Add new employment role
 *     tags: [Profiles]
 */
router.get('/employment', getEmployment);
router.post('/employment', [
  body('companyName').notEmpty().trim().escape(),
  body('role').notEmpty().trim().escape(),
  body('startDate').isDate(),
  body('endDate').optional().isDate()
], addEmployment);
router.delete('/employment/:id', deleteEmployment);

module.exports = router;
