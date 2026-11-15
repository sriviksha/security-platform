const mongoose = require("mongoose");
const crypto = require("crypto");

const reportSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      unique: true,
      default: () =>
        `CYB-${Date.now().toString(36).toUpperCase()}-${crypto
          .randomBytes(2)
          .toString("hex")
          .toUpperCase()}`
    },
    category: {
      type: String,
      required: true,
      enum: ["phishing", "digital-arrest", "fake-news", "other"],
      index: true
    },
    platform: {
      type: String,
      maxlength: 60,
      default: ""
    },
    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 1000
    },
    contact: {
      type: String,
      maxlength: 120,
      default: ""
    },
    status: {
      type: String,
      enum: ["new", "reviewed"],
      default: "new"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Report", reportSchema);
