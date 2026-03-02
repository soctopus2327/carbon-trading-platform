const TradeListing = require("../models/TradeListing");

//CREATE TRADE
exports.createTrade = async (req, res) => {
  try {
    const { pricePerCredit, quantity } = req.body;

    const trade = await TradeListing.create({
      sellerCompany: req.user.company,
      pricePerCredit,
      quantity,
      remainingQuantity: quantity
    });

    res.status(201).json(trade);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//GET ALL TRADES
exports.getAllTrades = async (req, res) => {
  try {

    const trades = await TradeListing
      .find()
      .populate("sellerCompany");

    res.json(trades);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//UPDATE TRADE
exports.updateTrade = async (req, res) => {
  try {

    const trade = await TradeListing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!trade)
      return res.status(404).json({ message: "Trade not found" });

    res.json(trade);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//DELETE TRADE
exports.deleteTrade = async (req, res) => {
  try {

    const trade = await TradeListing.findByIdAndDelete(req.params.id);

    if (!trade)
      return res.status(404).json({ message: "Trade not found" });

    res.json({ message: "Trade deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};