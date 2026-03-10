const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const platformAdminMiddleware = require("../middleware/platformAdminMiddleware");
const ctrl = require("../controllers/platformAdminController");

// ─────────────────────────────────────────────
// AUTH (no middleware needed)
// ─────────────────────────────────────────────
router.post("/auth/login", ctrl.login);
router.post("/auth/seed", ctrl.seedPlatformAdmin);   // One-time setup only — remove after use

// ─────────────────────────────────────────────
// Protected: requires valid JWT + PLATFORM_ADMIN role
// ─────────────────────────────────────────────

// Dashboard
router.get("/dashboard", authMiddleware, platformAdminMiddleware, ctrl.getDashboardStats);

// Company management
router.get("/companies", authMiddleware, platformAdminMiddleware, ctrl.getAllCompanies);
router.get("/companies/:id", authMiddleware, platformAdminMiddleware, ctrl.getCompanyDetails);
router.put("/companies/:id/approve", authMiddleware, platformAdminMiddleware, ctrl.approveCompany);
router.put("/companies/:id/reject", authMiddleware, platformAdminMiddleware, ctrl.rejectCompany);
router.put("/companies/:id/block", authMiddleware, platformAdminMiddleware, ctrl.blockCompany);
router.put("/companies/:id/unblock", authMiddleware, platformAdminMiddleware, ctrl.unblockCompany);
router.put("/companies/:id/credits", authMiddleware, platformAdminMiddleware, ctrl.adjustCredits);
router.delete("/companies/:id", authMiddleware, platformAdminMiddleware, ctrl.deleteCompany);

// User management
router.get("/users", authMiddleware, platformAdminMiddleware, ctrl.getAllCompanyAdmins);
router.delete("/users/:id", authMiddleware, platformAdminMiddleware, ctrl.deleteUser);

// Transactions audit
router.get("/transactions", authMiddleware, platformAdminMiddleware, ctrl.getAllTransactions);

module.exports = router;