const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
require("dotenv").config();

const app = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads
app.use("/uploads", express.static("uploads"));

// Serve University Analytics Dashboard
app.use("/dashboard", express.static("dashboard"));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", apiLimiter);

// Swagger configurations
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Phantasmagoria Alumni Influencers API",
      version: "1.0.0",
      description:
        "API documentation for Alumni Influencer engagement platform",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description:
            "Scoped API key for client applications (Analytics Dashboard or AR App)",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/profiles", require("./routes/profileRoutes"));
app.use("/api/bids", require("./routes/bidRoutes"));
app.use("/api/developer", require("./routes/developerRoutes"));
app.use("/api/public", require("./routes/publicRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/university-auth", require("./routes/universityAuthRoutes"));

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Something went wrong!", message: err.message });
});

module.exports = app;
