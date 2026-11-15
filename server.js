const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const Report = require("./models/Report");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(express.static(path.join(__dirname, "public")));

function cleanText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/[<>]/g, "").slice(0, maxLength);
}

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.post("/api/reports", async (req, res) => {
  try {
    const reportData = {
      category: cleanText(req.body.category, 40),
      platform: cleanText(req.body.platform, 60),
      description: cleanText(req.body.description, 1000),
      contact: cleanText(req.body.contact, 120)
    };

    const allowedCategories = [
      "phishing",
      "digital-arrest",
      "fake-news",
      "other"
    ];

    if (!allowedCategories.includes(reportData.category)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid incident category."
      });
    }

    if (reportData.description.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Description must contain at least 20 characters."
      });
    }

    const report = await Report.create(reportData);

    res.status(201).json({
      success: true,
      message: "Your awareness report has been recorded.",
      reference: report.reference
    });
  } catch (error) {
    console.error("Report creation error:", error);

    res.status(500).json({
      success: false,
      message: "The report could not be saved."
    });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const groupedReports = await Report.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    const categories = {
      phishing: 0,
      "digital-arrest": 0,
      "fake-news": 0,
      other: 0
    };

    groupedReports.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(categories, item._id)) {
        categories[item._id] = item.count;
      }
    });

    const total = Object.values(categories).reduce(
      (sum, value) => sum + value,
      0
    );

    res.json({
      success: true,
      total,
      categories
    });
  } catch (error) {
    console.error("Statistics error:", error);

    res.status(500).json({
      success: false,
      message: "Statistics are temporarily unavailable."
    });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing from the .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
