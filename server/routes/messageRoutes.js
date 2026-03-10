const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const platformAdminMiddleware = require("../middleware/platformAdminMiddleware");
const ctrl = require("../controllers/messageController");

// ── Platform Admin routes ──
router.post("/send", authMiddleware, platformAdminMiddleware, ctrl.sendMessage);
router.get("/sent", authMiddleware, platformAdminMiddleware, ctrl.getSentMessages);
router.get("/inbox", authMiddleware, platformAdminMiddleware, ctrl.getAdminInbox);
router.put("/:id/admin-read", authMiddleware, platformAdminMiddleware, ctrl.markAdminRead);
router.delete("/:id", authMiddleware, platformAdminMiddleware, ctrl.deleteMessage);
router.get("/companies-list", authMiddleware, platformAdminMiddleware, ctrl.getCompaniesList);

// ── Company routes ──
router.get("/my", authMiddleware, ctrl.getMyMessages);
router.put("/mark-all-read", authMiddleware, ctrl.markAllRead);
router.put("/:id/read", authMiddleware, ctrl.markAsRead);
router.post("/company-send", authMiddleware, ctrl.companyToAdmin);
router.get("/my-sent", authMiddleware, ctrl.getMySentMessages);

module.exports = router;