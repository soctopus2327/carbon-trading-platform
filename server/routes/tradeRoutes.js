const router = require("express").Router();
const tradeController = require("../controllers/tradeController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, tradeController.createTrade);

router.get("/", tradeController.getAllTrades);

router.put("/:id", authMiddleware, tradeController.updateTrade);

router.delete("/:id", authMiddleware, tradeController.deleteTrade);

module.exports = router;