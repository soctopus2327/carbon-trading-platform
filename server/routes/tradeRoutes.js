const router = require("express").Router();
const tradeController = require("../controllers/tradeController");
const authMiddleware = require("../middleware/authMiddleware");
const marketplaceAccessMiddleware = require("../middleware/marketplaceAccessMiddleware");
router.post("/paylater", authMiddleware,marketplaceAccessMiddleware, tradeController.payLater);
router.post("/", authMiddleware, marketplaceAccessMiddleware, tradeController.createTrade);
router.get("/", authMiddleware, marketplaceAccessMiddleware, tradeController.getAllTrades);
router.put("/:id", authMiddleware, marketplaceAccessMiddleware, tradeController.updateTrade);
router.delete("/:id", authMiddleware, marketplaceAccessMiddleware, tradeController.deleteTrade);

module.exports = router;
