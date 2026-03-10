const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const platformAdminMiddleware = require("../middleware/platformAdminMiddleware");
const ctrl = require("../controllers/notificationController");

// ── Platform Admin routes ──
router.post("/send", authMiddleware, platformAdminMiddleware, ctrl.sendNotification);
router.get("/sent", authMiddleware, platformAdminMiddleware, ctrl.getSentNotifications);
router.delete("/:id", authMiddleware, platformAdminMiddleware, ctrl.deleteNotification);

// ── Company routes ──
router.get("/my", authMiddleware, ctrl.getMyNotifications);
router.put("/mark-all-read", authMiddleware, ctrl.markAllAsRead);
router.put("/:id/read", authMiddleware, ctrl.markAsRead);

// ── Company Admin send ──
router.post("/company-send", authMiddleware, ctrl.sendCompanyNotification);

module.exports = router;