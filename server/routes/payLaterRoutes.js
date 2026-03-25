const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const marketplaceAccessMiddleware = require("../middleware/marketplaceAccessMiddleware");
const payLaterController = require("../controllers/payLaterController");

// Execute Pay Later Purchase
router.post(
  "/execute",
  authMiddleware,
  marketplaceAccessMiddleware,
  payLaterController.executePayLaterTransaction
);

// Make Payment
router.post(
  "/process-payment",
  authMiddleware,
  payLaterController.processPayLaterPayment
);

// Get Pending Payments
router.get(
  "/pending",
  authMiddleware,
  payLaterController.getPendingPayments
);

// Get Payment History
router.get(
  "/history",
  authMiddleware,
  payLaterController.getPayLaterHistory
);

// Check Overdue Payments (run as cron)
router.post(
  "/check-overdue",
  authMiddleware,
  payLaterController.checkOverduePayments
);

module.exports = router;
