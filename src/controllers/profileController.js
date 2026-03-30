const { validationResult } = require("express-validator");
const pool = require("../config/db");

const getProfile = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [profile] = await connection.query(
      "SELECT * FROM profiles WHERE user_id = ?",
      [req.user.id],
    );
    const [degrees] = await connection.query(
      "SELECT * FROM degrees WHERE user_id = ?",
      [req.user.id],
    );
    const [certifications] = await connection.query(
      "SELECT * FROM certifications WHERE user_id = ?",
      [req.user.id],
    );
    connection.release();

    if (profile.length === 0)
      return res.status(404).json({ error: "Profile not found" });
    res.json({ profile: profile[0], degrees, certifications });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateProfile = async (req, res) => {
  const { bio, linkedinUrl } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.query(
      "UPDATE profiles SET bio = ?, linkedin_url = ? WHERE user_id = ?",
      [bio || null, linkedinUrl || null, req.user.id],
    );
    connection.release();
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const _generateAdder = (tableName, cols) => async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const values = cols.map((c) => req.body[c]);
  try {
    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO ${tableName} (user_id, ${cols.map((c) => c.replace(/([A-Z])/g, "_$1").toLowerCase()).join(", ")}) VALUES (?, ${cols.map(() => "?").join(", ")})`,
      [req.user.id, ...values],
    );
    connection.release();
    res.status(201).json({ message: "Added successfully" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

const _generateGetter = (tableName) => async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM ${tableName} WHERE user_id = ?`,
      [req.user.id],
    );
    connection.release();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const _generateDeleter = (tableName) => async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query(
      `DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id],
    );
    connection.release();
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const uploadProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload a valid image file." });
  }

  // Construct the URL path to serve the file
  const imageUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/uploads/images/${req.file.filename}`;

  try {
    const connection = await pool.getConnection();
    await connection.query(
      "UPDATE profiles SET profile_image_url = ? WHERE user_id = ?",
      [imageUrl, req.user.id],
    );
    connection.release();

    res.json({ message: "Profile image uploaded successfully", imageUrl });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Database error while saving profile image URL" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  addDegree: _generateAdder("degrees", [
    "degreeName",
    "universityUrl",
    "completionDate",
  ]),
  getDegrees: _generateGetter("degrees"),
  deleteDegree: _generateDeleter("degrees"),
  addCertification: _generateAdder("certifications", [
    "certName",
    "courseUrl",
    "completionDate",
  ]),
  getCertifications: _generateGetter("certifications"),
  deleteCertification: _generateDeleter("certifications"),
  addLicence: _generateAdder("licences", [
    "licenceName",
    "bodyUrl",
    "completionDate",
  ]),
  getLicences: _generateGetter("licences"),
  deleteLicence: _generateDeleter("licences"),
  addCourse: _generateAdder("courses", [
    "courseName",
    "courseUrl",
    "completionDate",
  ]),
  getCourses: _generateGetter("courses"),
  deleteCourse: _generateDeleter("courses"),
  addEmployment: _generateAdder("employment", [
    "companyName",
    "role",
    "startDate",
    "endDate",
  ]),
  getEmployment: _generateGetter("employment"),
  deleteEmployment: _generateDeleter("employment"),
  uploadProfileImage,
};
