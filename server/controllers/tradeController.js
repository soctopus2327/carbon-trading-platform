const { request } = require("express");
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

    const trades = await TradeListing.find({
  remainingQuantity: { $gt: 0 }
}).populate("sellerCompany");

    res.json(trades);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//UPDATE TRADE
exports.updateTrade = async (req, res) => {
  try {
    const trade = await TradeListing.findById(req.params.id);
    console.log("Found trade for update:", req.body, trade);
    if (!trade)
      return res.status(404).json({ message: "Trade not found" });

    // Verify trade belongs to the requesting company
    if (trade.sellerCompany.toString() !== req.user.company.toString())
      return res.status(403).json({ message: "You can only update your own trades" });

    const updatedTrade = await TradeListing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("sellerCompany");

    res.json(updatedTrade);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//DELETE TRADE
exports.deleteTrade = async (req, res) => {
  try {
    const trade = await TradeListing.findById(req.params.id);

    if (!trade)
      return res.status(404).json({ message: "Trade not found" });

    // Verify trade belongs to the requesting company
    if (trade.sellerCompany.toString() !== req.user.company.toString())
      return res.status(403).json({ message: "You can only delete your own trades" });

    await TradeListing.findByIdAndDelete(req.params.id);

    res.json({ message: "Trade deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};