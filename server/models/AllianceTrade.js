const mongoose = require("mongoose");

const allianceTradeSchema = new mongoose.Schema({
  alliance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Alliance",
    required: true
  },

  sellerCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },

  pricePerCredit: {
    type: Number,
    required: true
  },

  quantity: {
    type: Number,
    required: true
  },

  remainingQuantity: {
    type: Number,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("AllianceTrade", allianceTradeSchema);