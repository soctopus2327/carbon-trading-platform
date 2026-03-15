const mongoose = require("mongoose");

const OptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 },
});

const VoterSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
});

const AlliancePollSchema = new mongoose.Schema(
  {
    alliance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alliance",
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    options: { type: [OptionSchema], default: [] },
    voters: { type: [VoterSchema], default: [] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    expiresAt: Date,
    status: {
      type: String,
      enum: ["ACTIVE", "CLOSED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlliancePoll", AlliancePollSchema);