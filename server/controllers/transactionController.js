const Company = require("../models/Company");
const Transaction = require("../models/Transaction");
const TradeListing = require("../models/TradeListing");

const { USER_ROLE } = require("../models/enums");

exports.executeTransaction = async (req, res) => {
  try {
    // 1️⃣ Role check
    if (![USER_ROLE.ADMIN, USER_ROLE.TRADER].includes(req.user.role)) {
      return res.status(403).json({ message: "Only Admins and Traders can execute trades" });
    }

    const { tradeId, quantity, useDiscount } = req.body;

    // 2️⃣ Fetch trade, buyer, seller
    const trade = await TradeListing.findById(tradeId);
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    const buyer = await Company.findById(req.user.company);
    const seller = await Company.findById(trade.sellerCompany);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    // 3️⃣ Prevent self-trade
    if (buyer._id.toString() === seller._id.toString())
      return res.status(400).json({ message: "Cannot trade with yourself" });

    // 4️⃣ Check ACTIVE status
    if (buyer.status !== "ACTIVE" || seller.status !== "ACTIVE")
      return res.status(403).json({ message: "Both companies must be ACTIVE" });

    // 5️⃣ Validate remaining quantity
    if (trade.remainingQuantity < quantity)
      return res.status(400).json({ message: "Not enough credits available" });

    // 6️⃣ Calculate discount
    let discountApplied = 0;
    let coinsUsed = 0;

    if (useDiscount && buyer.coins >= 100) {
      discountApplied = 1000; // Rs discount
      coinsUsed = 100;         // coins spent
      buyer.coins -= coinsUsed;
    }

    // 7️⃣ Total amount before discount (store in DB)
    const totalAmount = quantity * trade.pricePerCredit;

    // 8️⃣ Transfer carbon credits
    seller.carbonCredits -= quantity;
    buyer.carbonCredits += quantity;

    // 9️⃣ Reduce trade remaining quantity
    trade.remainingQuantity -= quantity;

    // 🔟 Create transaction
    const transaction = await Transaction.create({
      buyerCompany: buyer._id,
      sellerCompany: seller._id,
      listing: trade._id,
      credits: quantity,
      pricePerCredit: trade.pricePerCredit,
      totalAmount: totalAmount,       // full price
      discountApplied: discountApplied, // Rs discount applied
      status: "SUCCESS"
    });

    // 11️⃣ Update gamification points & coins
    const coinsEarned = quantity; // 1 coin per credit traded
    buyer.points += quantity;
    seller.points += quantity;
    buyer.coins += coinsEarned;
    // seller.coins += coinsEarned; // optional

    // 12️⃣ Save updated documents
    await buyer.save();
    await seller.save();
    await trade.save();

    // 13️⃣ Respond
    res.json({
      message: "Transaction successful",
      transaction,
      discountApplied,
      coinsUsed,
      coinsEarned,
    });

  } catch (err) {
    console.error(err);
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

