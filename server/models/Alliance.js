// models/Alliance.js

const mongoose = require("mongoose");

const allianceSchema = new mongoose.Schema({
  name: { type: String, required: true },

  code: { type: String, unique: true, required: true },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },

  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    }
  ],

  joinRequests: [
    {
      company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
      },

      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
      },

      requestedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Alliance", allianceSchema);