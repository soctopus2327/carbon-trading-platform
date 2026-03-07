const express = require("express");
const router = express.Router();

const leaderBoardController = require("../controllers/leaderBoardController");

router.get("/leaderboard", leaderBoardController.getLeaderboard);

module.exports = router;