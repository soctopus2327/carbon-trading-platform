const Company = require("../models/Company");
const Transaction = require("../models/Transaction");
const TradeListing = require("../models/TradeListing");

const { USER_ROLE } = require("../models/enums");

// exports.executeTransaction = async (req, res) => {
//   try {
//     if (![USER_ROLE.ADMIN, USER_ROLE.TRADER].includes(req.user.role)) {
//       return res.status(403).json({ message: "Only Admins and Traders can execute trades" });
//     }

//     const { tradeId, quantity, useDiscount } = req.body;
//     const parsedQuantity = Number(quantity);

//     if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
//       return res.status(400).json({ message: "Quantity must be a positive number" });
//     }

//     const trade = await TradeListing.findById(tradeId);
//     if (!trade) return res.status(404).json({ message: "Trade not found" });

//     const buyer = await Company.findById(req.user.company);
//     const seller = await Company.findById(trade.sellerCompany);

//     if (!buyer) return res.status(404).json({ message: "Buyer not found" });
//     if (!seller) return res.status(404).json({ message: "Seller not found" });

//     if (buyer._id.toString() === seller._id.toString()) {
//       return res.status(400).json({ message: "Cannot trade with yourself" });
//     }

//     if (buyer.status !== "ACTIVE" || seller.status !== "ACTIVE") {
//       return res.status(403).json({ message: "Both companies must be ACTIVE" });
//     }

//     const availableCredits = Math.min(trade.remainingQuantity, trade.quantity);
//     if (availableCredits < parsedQuantity) {
//       return res.status(400).json({ message: "Not enough credits available" });
//     }

//     let discountApplied = 0;
//     let coinsUsed = 0;

//     if (useDiscount && buyer.coins >= 100) {
//       discountApplied = 1000;
//       coinsUsed = 100;
//       buyer.coins -= coinsUsed;
//     }

//     const totalAmount = parsedQuantity * trade.pricePerCredit;

//     seller.carbonCredits -= parsedQuantity;
//     buyer.carbonCredits += parsedQuantity;

//     const nextCredits = availableCredits - parsedQuantity;
//     trade.remainingQuantity = nextCredits;
//     trade.quantity = nextCredits;

//     const transaction = await Transaction.create({
//       buyerCompany: buyer._id,
//       sellerCompany: seller._id,
//       listing: trade._id,
//       credits: parsedQuantity,
//       pricePerCredit: trade.pricePerCredit,
//       totalAmount,
//       discountApplied,
//       status: "SUCCESS",
//     });

//     const coinsEarned = parsedQuantity;
//     buyer.points += parsedQuantity;
//     seller.points += parsedQuantity;
//     buyer.coins += coinsEarned;

//     await buyer.save();
//     await seller.save();
//     await trade.save();

//     res.json({
//       message: "Transaction successful",
//       transaction,
//       discountApplied,
//       coinsUsed,
//       coinsEarned,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };
exports.executeTransaction = async (req, res) => {
  try {
    if (![USER_ROLE.ADMIN, USER_ROLE.TRADER].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only Admins and Traders can execute trades" });
    }

    const { tradeId, quantity, useDiscount, payLater, payLaterDate } = req.body;
    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be a positive number" });
    }

    const trade = await TradeListing.findById(tradeId);
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    // Debug: Check what we have
    console.log("User company:", req.user.company);
    console.log("Trade seller:", trade.sellerCompany);
    console.log("User role:", req.user.role);

    if (!req.user.company) {
      return res.status(400).json({ 
        message: "User is not assigned to a company",
        detail: "Please create or join a company first"
      });
    }

    if (!trade.sellerCompany) {
      return res.status(400).json({ 
        message: "Trade does not have a seller assigned",
        detail: "Trade listing is incomplete"
      });
    }

    const buyer = await Company.findById(req.user.company);
    const seller = await Company.findById(trade.sellerCompany);

    if (!buyer) {
      return res.status(404).json({ 
        message: "Buyer company not found",
        detail: `Company ID: ${req.user.company}`
      });
    }

    if (!seller) {
      return res.status(404).json({ 
        message: "Seller company not found",
        detail: `Company ID: ${trade.sellerCompany}`
      });
    }
    if (buyer._id.toString() === seller._id.toString()) {
      return res.status(400).json({ message: "Cannot trade with yourself" });
    }
    if (buyer.status !== "ACTIVE" || seller.status !== "ACTIVE") {
      return res.status(403).json({ message: "Both companies must be ACTIVE" });
    }

    const availableCredits = Math.min(trade.remainingQuantity, trade.quantity);
    if (availableCredits < parsedQuantity) {
      return res.status(400).json({ message: "Not enough credits available" });
    }

    let discountApplied = 0;
    let coinsUsed = 0;

    if (useDiscount && buyer.coins >= 100) {
      discountApplied = 1000;
      coinsUsed = 100;
      buyer.coins -= coinsUsed;
    }

    const totalAmount = parsedQuantity * trade.pricePerCredit;

    // Validate pay later date if needed
    if (payLater && !payLaterDate) {
      return res.status(400).json({ message: "Pay Later date is required" });
    }

    // Credits transfer happens immediately in both cases
    // seller.carbonCredits -= parsedQuantity;
    buyer.carbonCredits += parsedQuantity;

    const nextCredits = availableCredits - parsedQuantity;
    trade.remainingQuantity = nextCredits;
    trade.quantity = nextCredits;

    // Update trade listing if pay later is being used
    if (payLater && payLaterDate) {
      trade.payLaterUsed = true;
      trade.payLaterDate = payLaterDate;
    }

    const coinsEarned = parsedQuantity;
    buyer.points += parsedQuantity;
    seller.points += parsedQuantity;
    buyer.coins += coinsEarned;

    const transaction = await Transaction.create({
      buyerCompany: buyer._id,
      sellerCompany: seller._id,
      listing: trade._id,
      credits: parsedQuantity,
      pricePerCredit: trade.pricePerCredit,
      totalAmount,
      discountApplied,
      status: "SUCCESS",
      payLater: payLater || false,
      payLaterDate: payLater ? payLaterDate : null,
    });

    await buyer.save();
    await seller.save();
    await trade.save();

    // If pay later, create a notification for payment reminder
    if (payLater && payLaterDate) {
      try {
        const Notification = require("../models/Notification");
        await Notification.create({
          title: "Payment Due Reminder",
          message: `Payment of INR ${totalAmount} is due on ${new Date(payLaterDate).toLocaleDateString()} for ${parsedQuantity} credits purchased from ${seller.name}`,
          type: "PAYMENT_REMINDER",
          recipients: [
            {
              company: buyer._id,
              isRead: false,
            }
          ],
          transactionId: transaction._id,
          dueDate: payLaterDate,
        });
      } catch (notifErr) {
        console.error("Error creating payment reminder notification:", notifErr);
        // Continue even if notification fails
      }
    }

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
      $or: [{ buyerCompany: companyId }, { sellerCompany: companyId }],
    })
      .populate("buyerCompany", "name")
      .populate("sellerCompany", "name")
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
