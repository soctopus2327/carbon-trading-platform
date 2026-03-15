const Alliance = require("../models/Alliance");
const Company = require("../models/Company");
const Transaction = require("../models/Transaction");
const AllianceTrade = require("../models/AllianceTrade");
const AlliancePoll = require("../models/AlliancePoll");

const { nanoid } = require("nanoid");


/* ================= CREATE ALLIANCE ================= */

exports.createAlliance = async (req, res) => {
  try {

    const { name } = req.body;
    const companyId = req.user.company;

    const company = await Company.findById(companyId);

    if (!company)
      return res.status(404).json({ message: "Company not found" });

    const code = nanoid(8).toUpperCase();

    const alliance = await Alliance.create({
      name,
      code,
      createdBy: companyId,
      members: [companyId]
    });

    company.allianceMemberships.push(alliance._id);
    await company.save();

    res.json({
      message: "Alliance created successfully",
      alliance
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



/* ================= REQUEST JOIN ================= */

exports.requestJoinAlliance = async (req, res) => {
  try {

    const { code } = req.body;
    const companyId = req.user.company;

    const alliance = await Alliance.findOne({ code });

    if (!alliance)
      return res.status(404).json({ message: "Alliance not found" });

    if (alliance.members.some(m => m.toString() === companyId.toString()))
      return res.status(400).json({ message: "Already a member" });

    if (alliance.joinRequests.some(r => r.company.toString() === companyId.toString()))
      return res.status(400).json({ message: "Request already sent" });

    alliance.joinRequests.push({ company: companyId });

    await alliance.save();

    res.json({ message: "Join request sent successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



/* ================= HANDLE JOIN REQUEST ================= */

exports.handleJoinRequest = async (req, res) => {

  try {

    const { allianceId, companyId, action } = req.body;

    const alliance = await Alliance.findById(allianceId);

    if (!alliance)
      return res.status(404).json({ message: "Alliance not found" });

    if (alliance.createdBy.toString() !== req.user.company.toString())
      return res.status(403).json({
        message: "Only alliance creator can approve requests"
      });

    const request = alliance.joinRequests.find(
      r => r.company.toString() === companyId.toString()
    );

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (action === "APPROVE") {

      if (!alliance.members.some(m => m.toString() === companyId.toString()))
        alliance.members.push(companyId);

      const company = await Company.findById(companyId);

      if (!company.allianceMemberships.includes(alliance._id))
        company.allianceMemberships.push(alliance._id);

      await company.save();
    }

    alliance.joinRequests = alliance.joinRequests.filter(
      r => r.company.toString() !== companyId.toString()
    );

    await alliance.save();

    res.json({
      message: `Request ${action.toLowerCase()} successfully`
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};



/* ================= GET MEMBERS ================= */

exports.getAllianceMembers = async (req, res) => {

  try {

    const company = await Company.findById(req.user.company);

    const alliances = await Alliance.find({
      _id: { $in: company.allianceMemberships }
    })
      .populate("members", "name companyType status carbonCredits")
      .populate("joinRequests.company", "name companyType status carbonCredits");

    res.json(alliances);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};



/* ================= GET MY ALLIANCES ================= */

exports.getMyAlliances = async (req, res) => {

  try {

    const company = await Company.findById(req.user.company)
      .populate("allianceMemberships", "name code");

    res.json(company.allianceMemberships);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};



/* ================= ALLIANCE DASHBOARD ================= */

exports.getAllianceDashboard = async (req, res) => {

  try {

    const company = await Company.findById(req.user.company);

    const alliances = await Alliance.find({
      _id: { $in: company.allianceMemberships }
    }).populate("members");

    const dashboard = await Promise.all(
      alliances.map(async alliance => {

        const memberIds = alliance.members.map(m => m._id);

        const trades = await Transaction.find({
          buyerCompany: { $in: memberIds },
          sellerCompany: { $in: memberIds }
        });

        const totalCredits = trades.reduce(
          (sum, t) => sum + t.credits,
          0
        );

        return {
          allianceId: alliance._id,
          allianceName: alliance.name,
          allianceCode: alliance.code,
          members: alliance.members.length,
          totalTrades: trades.length,
          totalCredits
        };

      })
    );

    res.json(dashboard);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};



/* ================= ALLIANCE MARKETPLACE ================= */

exports.getAllianceMarketplace = async (req, res) => {

  try {

    const company = await Company.findById(req.user.company);

    const alliances = await Alliance.find({
      _id: { $in: company.allianceMemberships }
    });

    const result = [];

    for (const alliance of alliances) {

      const trades = await AllianceTrade.find({
        alliance: alliance._id,
        remainingQuantity: { $gt: 0 }
      }).populate("sellerCompany", "name");

      result.push({
        allianceId: alliance._id,
        allianceName: alliance.name,
        trades: trades.map(trade => ({
          _id: trade._id,
          sellerCompanyName: trade.sellerCompany.name,
          sellerCompanyId: trade.sellerCompany._id,
          pricePerCredit: trade.pricePerCredit,
          remainingQuantity: trade.remainingQuantity
        }))
      });

    }

    res.json(result);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};



/* ================= CREATE TRADE ================= */

exports.createAllianceTrade = async (req, res) => {
  try {

    const { allianceId, pricePerCredit, quantity } = req.body;
    const companyId = req.user.company;

    const company = await Company.findById(companyId);

    if (!company)
      return res.status(404).json({ message: "Company not found" });

    if (company.carbonCredits < quantity)
      return res.status(400).json({ message: "Not enough credits to sell" });

    // RESERVE CREDITS
    company.carbonCredits -= quantity;
    await company.save();

    const trade = await AllianceTrade.create({
      alliance: allianceId,
      sellerCompany: companyId,
      pricePerCredit,
      quantity,
      remainingQuantity: quantity
    });

    res.json({
      message: "Trade created successfully",
      trade
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



/* ================= BUY CREDITS ================= */

exports.buyAllianceCredits = async (req, res) => {

  try {

    const { tradeId, quantity } = req.body;
    const buyerCompanyId = req.user.company;

    const trade = await AllianceTrade.findById(tradeId);

    if (!trade)
      return res.status(404).json({ message: "Trade not found" });

    if (trade.sellerCompany.toString() === buyerCompanyId.toString())
      return res.status(400).json({
        message: "You cannot buy your own credits"
      });

    if (trade.remainingQuantity < quantity)
      return res.status(400).json({ message: "Not enough credits available" });

    const sellerCompany = await Company.findById(trade.sellerCompany);
    const buyerCompany = await Company.findById(buyerCompanyId);

    sellerCompany.carbonCredits -= quantity;
    buyerCompany.carbonCredits += quantity;

    await sellerCompany.save();
    await buyerCompany.save();

    trade.remainingQuantity -= quantity;
    await trade.save();

    const totalAmount = trade.pricePerCredit * quantity;

    await Transaction.create({
      sellerCompany: sellerCompany._id,
      buyerCompany: buyerCompanyId,
      pricePerCredit: trade.pricePerCredit,
      credits: quantity,
      totalAmount
    });

    res.json({
      message: "Credits purchased successfully"
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};



/* ================= UPDATE TRADE ================= */
exports.updateAllianceTrade = async (req, res) => {

  try {

    const trade = await AllianceTrade.findById(req.params.id);

    if (!trade)
      return res.status(404).json({ message: "Trade not found" });

    if (trade.sellerCompany.toString() !== req.user.company.toString())
      return res.status(403).json({
        message: "You can only update your own trade"
      });

    const { pricePerCredit, quantity } = req.body;

    const company = await Company.findById(req.user.company);

    const difference = quantity - trade.remainingQuantity;

    if (difference > 0 && company.carbonCredits < difference)
      return res.status(400).json({
        message: "Not enough credits to increase quantity"
      });

    // adjust credits
    company.carbonCredits -= difference;
    await company.save();

    trade.pricePerCredit = pricePerCredit;
    trade.quantity = quantity;
    trade.remainingQuantity = quantity;

    await trade.save();

    res.json({
      message: "Trade updated successfully",
      trade
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};



/* ================= DELETE TRADE ================= */

exports.deleteAllianceTrade = async (req, res) => {

  try {

    const trade = await AllianceTrade.findById(req.params.id);

    if (!trade)
      return res.status(404).json({ message: "Trade not found" });

    if (trade.sellerCompany.toString() !== req.user.company.toString())
      return res.status(403).json({
        message: "You can only delete your own trade"
      });

    const company = await Company.findById(trade.sellerCompany);

    // return remaining credits
    company.carbonCredits += trade.remainingQuantity;
    await company.save();

    await AllianceTrade.findByIdAndDelete(req.params.id);

    res.json({
      message: "Trade deleted successfully"
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};

exports.createAlliancePoll = async (req, res) => {

  try {

    const { allianceId, question, options, expiresAt } = req.body;

    if (!options || options.length < 2)
      return res.status(400).json({
        message: "Poll must have at least 2 options"
      });

    const poll = await AlliancePoll.create({
      alliance: allianceId,
      question,
      options: options.map(o => ({ text: o })),
      createdBy: req.user.company,
      expiresAt
    });

    res.json({
      message: "Poll created successfully",
      poll
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};

exports.voteAlliancePoll = async (req, res) => {

  try {

    const { pollId, optionIndex } = req.body;

    const poll = await AlliancePoll.findById(pollId);

    if (!poll)
      return res.status(404).json({ message: "Poll not found" });

    if (poll.status === "CLOSED")
      return res.status(400).json({ message: "Poll closed" });

    if (poll.voters.some(v =>
      v.company.toString() === req.user.company.toString()
    ))
      return res.status(400).json({
        message: "You already voted"
      });

    poll.options[optionIndex].votes += 1;

    poll.voters.push({
      company: req.user.company
    });

    await poll.save();

    res.json({
      message: "Vote recorded"
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};

exports.getAlliancePolls = async (req, res) => {

  try {

    const { allianceId } = req.query;

    const polls = await AlliancePoll.find({
      alliance: allianceId
    }).populate("createdBy", "name");

    res.json(polls);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

};
