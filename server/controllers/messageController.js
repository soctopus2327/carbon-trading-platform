const Message = require("../models/Message");
const Company = require("../models/Company");

// ─────────────────────────────────────────────
// PLATFORM ADMIN — Send messages to companies
// ─────────────────────────────────────────────

/**
 * POST /messages/send
 * Platform admin sends to one, many, or all companies
 * Body: { subject, body, broadcastType, companyIds[] }
 */
exports.sendMessage = async (req, res) => {
  try {
    const { subject, body, broadcastType, companyIds } = req.body;

    if (!subject || !body || !broadcastType)
      return res.status(400).json({ message: "Subject, body and broadcastType are required" });

    let recipientCompanies = [];

    if (broadcastType === "BROADCAST") {
      const companies = await Company.find({ status: "ACTIVE" }).select("_id");
      recipientCompanies = companies.map(c => c._id);
    } else if (broadcastType === "MULTICAST") {
      if (!companyIds || companyIds.length < 2)
        return res.status(400).json({ message: "Select at least 2 companies for multicast" });
      recipientCompanies = companyIds;
    } else if (broadcastType === "UNICAST") {
      if (!companyIds || companyIds.length !== 1)
        return res.status(400).json({ message: "Select exactly 1 company for unicast" });
      recipientCompanies = companyIds;
    } else {
      return res.status(400).json({ message: "Invalid broadcastType" });
    }

    const recipients = recipientCompanies.map(companyId => ({
      company: companyId,
      isRead: false,
      readAt: null
    }));

    const message = await Message.create({
      subject,
      body,
      direction: "PLATFORM_TO_COMPANY",
      broadcastType,
      senderUser: req.user._id,
      senderCompany: null,
      recipients
    });

    res.status(201).json({
      message: `Message sent to ${recipients.length} company/companies`,
      data: message
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /messages/sent
 * Platform admin — get all messages they sent
 */
exports.getSentMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, total] = await Promise.all([
      Message.find({ direction: "PLATFORM_TO_COMPANY" })
        .populate("senderUser", "name email")
        .populate("recipients.company", "name status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Message.countDocuments({ direction: "PLATFORM_TO_COMPANY" })
    ]);

    res.json({ messages, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /messages/inbox
 * Platform admin — get all messages from companies
 */
exports.getAdminInbox = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, total] = await Promise.all([
      Message.find({ direction: "COMPANY_TO_PLATFORM" })
        .populate("senderUser", "name email role")
        .populate("senderCompany", "name status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Message.countDocuments({ direction: "COMPANY_TO_PLATFORM" })
    ]);

    const unreadCount = await Message.countDocuments({
      direction: "COMPANY_TO_PLATFORM",
      adminRead: false
    });

    res.json({ messages, total, unreadCount, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /messages/:id/admin-read
 * Platform admin marks a company message as read
 */
exports.markAdminRead = async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, {
      adminRead: true,
      adminReadAt: new Date()
    });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /messages/:id
 * Platform admin deletes a message
 */
exports.deleteMessage = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /messages/companies-list
 * Platform admin — get list of active companies for targeting
 */
exports.getCompaniesList = async (req, res) => {
  try {
    const companies = await Company.find({ status: "ACTIVE" }).select("_id name companyType");
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ─────────────────────────────────────────────
// COMPANY — View & send messages
// ─────────────────────────────────────────────

/**
 * GET /messages/my
 * Company users — get all messages from platform addressed to their company
 */
exports.getMyMessages = async (req, res) => {
  try {
    const companyId = req.user.company;
    if (!companyId) return res.status(403).json({ message: "No company associated" });

    const messages = await Message.find({
      direction: "PLATFORM_TO_COMPANY",
      "recipients.company": companyId
    })
      .populate("senderUser", "name role")
      .sort({ createdAt: -1 });

    const result = messages.map(m => {
      const recipient = m.recipients.find(
        r => r.company.toString() === companyId.toString()
      );
      return {
        _id: m._id,
        subject: m.subject,
        body: m.body,
        broadcastType: m.broadcastType,
        senderUser: m.senderUser,
        isRead: recipient?.isRead || false,
        readAt: recipient?.readAt || null,
        createdAt: m.createdAt
      };
    });

    const unreadCount = result.filter(m => !m.isRead).length;
    res.json({ messages: result, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /messages/:id/read
 * Company — mark a platform message as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const companyId = req.user.company;

    await Message.updateOne(
      { _id: req.params.id, "recipients.company": companyId },
      {
        $set: {
          "recipients.$.isRead": true,
          "recipients.$.readAt": new Date()
        }
      }
    );

    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /messages/mark-all-read
 * Company — mark all platform messages as read
 */
exports.markAllRead = async (req, res) => {
  try {
    const companyId = req.user.company;

    await Message.updateMany(
      { direction: "PLATFORM_TO_COMPANY", "recipients.company": companyId },
      {
        $set: {
          "recipients.$[elem].isRead": true,
          "recipients.$[elem].readAt": new Date()
        }
      },
      { arrayFilters: [{ "elem.company": companyId }] }
    );

    res.json({ message: "All messages marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /messages/company-send
 * Company user sends a message to the platform admin
 * Body: { subject, body }
 */
exports.companyToAdmin = async (req, res) => {
  try {
    const { subject, body } = req.body;

    if (!subject || !body)
      return res.status(400).json({ message: "Subject and body are required" });

    if (!req.user.company)
      return res.status(403).json({ message: "No company associated with your account" });

    const message = await Message.create({
      subject,
      body,
      direction: "COMPANY_TO_PLATFORM",
      broadcastType: "UNICAST",
      senderUser: req.user._id,
      senderCompany: req.user.company,
      recipients: [],
      adminRead: false
    });

    await message.populate("senderUser", "name email");
    await message.populate("senderCompany", "name");

    res.status(201).json({ message: "Message sent to platform admin", data: message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /messages/my-sent
 * Company user — see messages they sent to platform
 */
exports.getMySentMessages = async (req, res) => {
  try {
    const companyId = req.user.company;
    if (!companyId) return res.status(403).json({ message: "No company associated" });

    const messages = await Message.find({
      direction: "COMPANY_TO_PLATFORM",
      senderCompany: companyId
    }).sort({ createdAt: -1 });

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};