const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const marketplaceAccessMiddleware = require("../middleware/marketplaceAccessMiddleware");
const transactionController = require("../controllers/transactionController");

// Execute transaction
router.post("/execute", authMiddleware, marketplaceAccessMiddleware, transactionController.executeTransaction);

// Get transaction history
router.get("/my-transactions", authMiddleware, marketplaceAccessMiddleware, transactionController.getMyTransactions);

module.exports = router;
