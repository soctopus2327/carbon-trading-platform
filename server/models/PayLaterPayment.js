const mongoose = require("mongoose");

const payLaterPaymentSchema = new mongoose.Schema({
  // Transaction Reference
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    required: true
  },

  // Companies involved
  buyerCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },

  sellerCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },

  // Payment Details
  totalAmount: {
    type: Number,
    required: true
  },

  creditsPurchased: {
    type: Number,
    required: true
  },

  pricePerCredit: {
    type: Number,
    required: true
  },

  // Payment Schedule
  dueDate: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["PENDING", "FULLY_PAID", "OVERDUE", "FAILED"],
    default: "PENDING"
  },

  // Payment Progress
  amountPaid: {
    type: Number,
    default: 0
  },

  amountPending: {
    type: Number,
    required: true
  },

  // Payment History (simple)
  paymentHistory: [
    {
      amount: Number,
      date: { type: Date, default: Date.now }
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("PayLaterPayment", payLaterPaymentSchema);
