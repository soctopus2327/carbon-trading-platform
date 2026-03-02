const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const transactionController = require("../controllers/transactionController");

// Execute transaction
router.post("/execute", authMiddleware, transactionController.executeTransaction);

// Get transaction history
router.get("/my-transactions", authMiddleware, transactionController.getMyTransactions);

module.exports = router;