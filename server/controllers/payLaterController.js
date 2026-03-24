const Company = require("../models/Company");
const Transaction = require("../models/Transaction");
const TradeListing = require("../models/TradeListing");
const PayLaterPayment = require("../models/PayLaterPayment");
const Notification = require("../models/Notification");

const { USER_ROLE } = require("../models/enums");

/**
 * Execute a transaction with Pay Later option
 * Credits transferred immediately, payment deferred to due date
 */
exports.executePayLaterTransaction = async (req, res) => {
  try {
    const { tradeId, quantity, payLaterDays = 30 } = req.body;
    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be positive" });
    }

    // Get trade, buyer, seller
    const trade = await TradeListing.findById(tradeId);
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    // Debug: Check what we have
    console.log("User company:", req.user.company);
    console.log("Trade seller:", trade.sellerCompany);

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

    // Check available credits
    const availableCredits = Math.min(trade.remainingQuantity, trade.quantity);
    if (availableCredits < parsedQuantity) {
      return res.status(400).json({ message: "Not enough credits available" });
    }

    // Check if buyer can afford or has pay later limit
    const totalAmount = parsedQuantity * trade.pricePerCredit;
    const availableLimit = buyer.payLaterLimit - buyer.currentPayLaterDebt;

    if (totalAmount > availableLimit) {
      return res.status(403).json({
        message: "Pay later limit exceeded",
        availableLimit,
        requested: totalAmount
      });
    }

    // ===== TRANSFER CREDITS IMMEDIATELY =====
    buyer.carbonCredits += parsedQuantity;

    const nextCredits = availableCredits - parsedQuantity;
    trade.remainingQuantity = nextCredits;
    trade.quantity = nextCredits;

    // ===== CREATE TRANSACTION RECORD =====
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + payLaterDays);

    const transaction = await Transaction.create({
      buyerCompany: buyer._id,
      sellerCompany: seller._id,
      listing: trade._id,
      credits: parsedQuantity,
      pricePerCredit: trade.pricePerCredit,
      totalAmount,
      status: "SUCCESS",
      payLater: true,
      payLaterDate: dueDate
    });

    // ===== CREATE PAY LATER PAYMENT RECORD =====
    const payLaterPayment = await PayLaterPayment.create({
      transaction: transaction._id,
      buyerCompany: buyer._id,
      sellerCompany: seller._id,
      totalAmount,
      creditsPurchased: parsedQuantity,
      pricePerCredit: trade.pricePerCredit,
      dueDate,
      amountPending: totalAmount,
      status: "PENDING"
    });

    transaction.payLaterPaymentRef = payLaterPayment._id;
    await transaction.save();

    // ===== UPDATE COMPANY DEBT =====
    buyer.currentPayLaterDebt += totalAmount;

    // ===== SEND NOTIFICATION =====
    await Notification.create({
      title: "Pay Later Invoice Created",
      message: `You purchased ${parsedQuantity} credits from ${seller.name}. Payment of INR ${totalAmount.toFixed(2)} due on ${dueDate.toLocaleDateString()}`,
      type: "PAYMENT_REMINDER",
      recipients: [{ company: buyer._id, isRead: false }],
      transactionId: transaction._id,
      dueDate
    });

    // ===== SAVE ALL =====
    await buyer.save();
    await seller.save();
    await trade.save();

    res.json({
      message: "Pay later purchase successful",
      transaction: {
        id: transaction._id,
        credits: parsedQuantity,
        totalAmount: totalAmount.toFixed(2),
        dueDate: dueDate.toLocaleDateString()
      },
      buyerState: {
        carbonCredits: buyer.carbonCredits,
        currentPayLaterDebt: buyer.currentPayLaterDebt,
        payLaterLimit: buyer.payLaterLimit,
        availableLimit: buyer.payLaterLimit - buyer.currentPayLaterDebt,
        creditBalance: buyer.carbonCredits
      }
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Make a payment against pay later debt
 */
exports.processPayLaterPayment = async (req, res) => {
  try {
    const { payLaterPaymentId, amountPaid } = req.body;

    if (!payLaterPaymentId || !amountPaid || amountPaid <= 0) {
      return res.status(400).json({ message: "Invalid payment details" });
    }

    const payLaterPayment = await PayLaterPayment.findById(payLaterPaymentId)
      .populate("buyerCompany sellerCompany");

    if (!payLaterPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Only buyer can pay
    if (payLaterPayment.buyerCompany._id.toString() !== req.user.company.toString()) {
      return res.status(403).json({ message: "Only buyer can pay" });
    }

    if (payLaterPayment.status === "FULLY_PAID") {
      return res.status(400).json({ message: "Already paid" });
    }

    const buyer = await Company.findById(payLaterPayment.buyerCompany._id);

    // ===== UPDATE PAYMENT RECORD =====
    const newAmountPaid = payLaterPayment.amountPaid + amountPaid;
    const newAmountPending = Math.max(0, payLaterPayment.totalAmount - newAmountPaid);

    let newStatus = "PENDING";
    if (newAmountPending <= 0) {
      newStatus = "FULLY_PAID";
    }

    payLaterPayment.amountPaid = newAmountPaid;
    payLaterPayment.amountPending = newAmountPending;
    payLaterPayment.status = newStatus;

    payLaterPayment.paymentHistory.push({
      amount: amountPaid,
      date: new Date()
    });

    // ===== UPDATE COMPANY DEBT =====
    buyer.currentPayLaterDebt = Math.max(0, buyer.currentPayLaterDebt - amountPaid);

    await payLaterPayment.save();
    await buyer.save();

    // ===== SEND NOTIFICATION =====
    await Notification.create({
      title: "Payment Received",
      message: `Payment of INR ${amountPaid.toFixed(2)} received. ${
        newStatus === "FULLY_PAID"
          ? "Your debt is cleared."
          : `Remaining: INR ${newAmountPending.toFixed(2)}`
      }`,
      type: "PAYMENT_REMINDER",
      recipients: [{ company: buyer._id, isRead: false }]
    });

    res.json({
      message: "Payment processed",
      payLaterPayment: {
        status: newStatus,
        amountPaid: payLaterPayment.amountPaid,
        amountPending: newAmountPending
      },
      company: {
        currentDebt: buyer.currentPayLaterDebt,
        availableLimit: buyer.payLaterLimit - buyer.currentPayLaterDebt
      }
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all pending pay later payments
 */
exports.getPendingPayments = async (req, res) => {
  try {
    const companyId = req.user.company;

    const pendingPayments = await PayLaterPayment.find({
      buyerCompany: companyId,
      status: { $in: ["PENDING", "OVERDUE"] }
    })
      .populate("sellerCompany", "name")
      .sort({ dueDate: 1 });

    const now = new Date();
    let totalPending = 0;
    let overdueAmount = 0;

    const mapped = pendingPayments.map((payment) => {
      const isOverdue = now > payment.dueDate;
      if (isOverdue) {
        overdueAmount += payment.amountPending;
      }
      totalPending += payment.amountPending;

      return {
        id: payment._id,
        seller: payment.sellerCompany.name,
        totalAmount: payment.totalAmount,
        amountPaid: payment.amountPaid,
        amountPending: payment.amountPending,
        dueDate: payment.dueDate.toLocaleDateString(),
        isOverdue: isOverdue,
        status: payment.status
      };
    });

    res.json({
      summary: {
        totalPending: totalPending.toFixed(2),
        overdueAmount: overdueAmount.toFixed(2),
        paymentCount: mapped.length
      },
      payments: mapped
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get pay later history
 */
exports.getPayLaterHistory = async (req, res) => {
  try {
    const companyId = req.user.company;

    const history = await PayLaterPayment.find({
      $or: [
        { buyerCompany: companyId },
        { sellerCompany: companyId }
      ]
    })
      .populate("sellerCompany", "name")
      .populate("buyerCompany", "name")
      .sort({ createdAt: -1 });

    const mapped = history.map((payment) => ({
      id: payment._id,
      buyer: payment.buyerCompany.name,
      seller: payment.sellerCompany.name,
      amount: payment.totalAmount.toFixed(2),
      status: payment.status,
      dueDate: payment.dueDate.toLocaleDateString(),
      amountPaid: payment.amountPaid.toFixed(2),
      createdAt: payment.createdAt.toLocaleDateString()
    }));

    res.json({
      total: mapped.length,
      history: mapped
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Mark overdue payments and apply late fees
 * Call this daily via cron job
 */
exports.checkOverduePayments = async (req, res) => {
  try {
    const now = new Date();

    const overduePayments = await PayLaterPayment.find({
      dueDate: { $lt: now },
      status: { $in: ["PENDING"] }
    });

    for (const payment of overduePayments) {
      payment.status = "OVERDUE";
      await payment.save();

      // Send notification
      const buyer = await Company.findById(payment.buyerCompany);
      await Notification.create({
        title: "⚠️ Payment Overdue",
        message: `Your payment of INR ${payment.amountPending.toFixed(2)} is overdue since ${payment.dueDate.toLocaleDateString()}`,
        type: "PAYMENT_REMINDER",
        recipients: [{ company: buyer._id, isRead: false }]
      });
    }

    res.json({
      message: `Marked ${overduePayments.length} as overdue`,
      count: overduePayments.length
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
};

