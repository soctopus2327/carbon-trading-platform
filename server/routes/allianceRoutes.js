const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createAlliance,
  requestJoinAlliance,
  handleJoinRequest,
  getMyAlliances,
  getAllianceMembers,
  getAllianceDashboard,
  getAllianceMarketplace,
  createAllianceTrade,
  buyAllianceCredits,
  updateAllianceTrade,
  deleteAllianceTrade,
  createAlliancePoll,
  voteAlliancePoll,
  getAlliancePolls,
  closeAlliancePoll
} = require("../controllers/allianceController");


/* ===== ALLIANCE ===== */

router.post("/create", authMiddleware, createAlliance);
router.post("/request-join", authMiddleware, requestJoinAlliance);
router.post("/handle-request", authMiddleware, handleJoinRequest);


/* ===== ALLIANCE INFO ===== */

router.get("/my-alliances", authMiddleware, getMyAlliances);
router.get("/members", authMiddleware, getAllianceMembers);
router.get("/dashboard", authMiddleware, getAllianceDashboard);


/* ===== MARKETPLACE ===== */

router.get("/marketplace", authMiddleware, getAllianceMarketplace);


/* ===== TRADES ===== */

router.post("/create-trade", authMiddleware, createAllianceTrade);
router.post("/buy", authMiddleware, buyAllianceCredits);

router.put("/update-trade/:id", authMiddleware, updateAllianceTrade);
router.delete("/delete-trade/:id", authMiddleware, deleteAllianceTrade);


router.post("/poll/create", authMiddleware, createAlliancePoll);

router.post("/poll/vote", authMiddleware, voteAlliancePoll);

router.get("/polls", authMiddleware, getAlliancePolls);


module.exports = router;