const Company = require("../models/Company");
const Transaction = require("../models/Transaction");
const TradeListing = require("../models/TradeListing");

const { USER_ROLE } = require("../models/enums");



exports.executeTransaction = async (req, res) => {
  try {

    // ROLE CHECK
    if (
      req.user.role !== USER_ROLE.ADMIN &&
      req.user.role !== USER_ROLE.TRADER
    ) {
      return res.status(403).json({
        message: "Only Admins and Traders can execute trades"
      });
    }

    const { tradeId, quantity } = req.body;

    const trade = await TradeListing.findById(tradeId);
    if (!trade)
      return res.status(404).json({ message: "Trade not found" });

    const buyer = await Company.findById(req.user.company);
    const seller = await Company.findById(trade.sellerCompany);

    if (!seller)
      return res.status(404).json({ message: "Seller not found" });

    // Prevent self trade
    if (buyer._id.toString() === seller._id.toString())
      return res.status(400).json({ message: "Cannot trade with yourself" });

    // Check active
    if (buyer.status !== "ACTIVE" || seller.status !== "ACTIVE")
      return res.status(403).json({ message: "Both companies must be ACTIVE" });

    // Validate remaining trade quantity
    if (trade.remainingQuantity < quantity)
      return res.status(400).json({ message: "Not enough credits available" });

    // Transfer credits
    seller.carbonCredits -= quantity;
    buyer.carbonCredits += quantity;


    // Reduce trade remaining
    trade.remainingQuantity -= quantity;

    await seller.save();
    await buyer.save();
    await trade.save();

    const transaction = await Transaction.create({
      buyerCompany: buyer._id,
      sellerCompany: seller._id,
      credits: quantity,
      pricePerCredit: trade.pricePerCredit,
      totalAmount: quantity * trade.pricePerCredit,
      status: "SUCCESS"
    });

    // Add gamification points to companies
    buyer.points += quantity;
    seller.points += quantity;
    await buyer.save();
    await seller.save();
    res.json({ message: "Transaction successful", transaction });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyTransactions = async (req, res) => {
  try {
    const companyId = req.user.company;

    const transactions = await Transaction.find({
      $or: [
        { buyerCompany: companyId },
        { sellerCompany: companyId }
      ]
    })
      .populate("buyerCompany", "name")
      .populate("sellerCompany", "name")
      .sort({ createdAt: -1 });

    res.json(transactions);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

