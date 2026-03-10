const Notification = require("../models/Notification");
const Company = require("../models/Company");
const User = require("../models/User");

// ─────────────────────────────────────────────
// PLATFORM ADMIN — Send Notifications
// ─────────────────────────────────────────────

/**
 * POST /notifications/send
 * Send broadcast, multicast or unicast notification
 * Body: { title, message, type, companyIds[] }
 * companyIds is required for MULTICAST and UNICAST, ignored for BROADCAST
 */
exports.sendNotification = async (req, res) => {
    try {
        const { title, message, type, companyIds } = req.body;

        if (!title || !message || !type)
            return res.status(400).json({ message: "Title, message and type are required" });

        let recipientCompanies = [];

        if (type === "BROADCAST") {
            // Send to all ACTIVE companies
            const companies = await Company.find({ status: "ACTIVE" }).select("_id");
            recipientCompanies = companies.map(c => c._id);

        } else if (type === "MULTICAST") {
            if (!companyIds || companyIds.length < 2)
                return res.status(400).json({ message: "Select at least 2 companies for multicast" });
            recipientCompanies = companyIds;

        } else if (type === "UNICAST") {
            if (!companyIds || companyIds.length !== 1)
                return res.status(400).json({ message: "Select exactly 1 company for unicast" });
            recipientCompanies = companyIds;

        } else {
            return res.status(400).json({ message: "Invalid type. Use BROADCAST, MULTICAST or UNICAST" });
        }

        const recipients = recipientCompanies.map(companyId => ({
            company: companyId,
            isRead: false,
            readAt: null
        }));

        const notification = await Notification.create({
            title,
            message,
            type,
            sentBy: req.user._id,
            recipients
        });

        res.status(201).json({
            message: `Notification sent to ${recipients.length} company/companies`,
            notification
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /notifications/sent
 * Platform admin — get all sent notifications
 */
exports.getSentNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [notifications, total] = await Promise.all([
            Notification.find()
                .populate("sentBy", "name email role")
                .populate("recipients.company", "name status")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Notification.countDocuments()
        ]);

        res.json({ notifications, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE /notifications/:id
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ message: "Notification deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ─────────────────────────────────────────────
// COMPANY — Receive Notifications
// ─────────────────────────────────────────────

/**
 * GET /notifications/my
 * Company — get all notifications for their company
 */
exports.getMyNotifications = async (req, res) => {
    try {
        const companyId = req.user.company;

        const notifications = await Notification.find({
            "recipients.company": companyId
        })
            .populate("sentBy", "name role")
            .sort({ createdAt: -1 });

        // Map to include read status for this specific company
        const result = notifications.map(n => {
            const recipient = n.recipients.find(
                r => r.company.toString() === companyId.toString()
            );
            return {
                _id: n._id,
                title: n.title,
                message: n.message,
                type: n.type,
                sentBy: n.sentBy,
                isRead: recipient?.isRead || false,
                readAt: recipient?.readAt || null,
                createdAt: n.createdAt
            };
        });

        // Count unread
        const unreadCount = result.filter(n => !n.isRead).length;

        res.json({ notifications: result, unreadCount });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUT /notifications/:id/read
 * Company — mark a notification as read
 */
exports.markAsRead = async (req, res) => {
    try {
        const companyId = req.user.company;

        await Notification.updateOne(
            {
                _id: req.params.id,
                "recipients.company": companyId
            },
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
 * PUT /notifications/mark-all-read
 * Company — mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const companyId = req.user.company;

        await Notification.updateMany(
            { "recipients.company": companyId },
            {
                $set: {
                    "recipients.$[elem].isRead": true,
                    "recipients.$[elem].readAt": new Date()
                }
            },
            {
                arrayFilters: [{ "elem.company": companyId }]
            }
        );

        res.json({ message: "All notifications marked as read" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ─────────────────────────────────────────────
// COMPANY ADMIN — Send Notifications to own company users
// ─────────────────────────────────────────────

/**
 * POST /notifications/company-send
 * Company admin sends notification to their own company
 * (shows up as internal company notification)
 */
exports.sendCompanyNotification = async (req, res) => {
    try {
        const { title, message } = req.body;

        if (!title || !message)
            return res.status(400).json({ message: "Title and message are required" });

        if (req.user.role !== "ADMIN")
            return res.status(403).json({ message: "Only company admins can send notifications" });

        const notification = await Notification.create({
            title,
            message,
            type: "UNICAST",
            sentBy: req.user._id,
            recipients: [{
                company: req.user.company,
                isRead: false,
                readAt: null
            }]
        });

        res.status(201).json({ message: "Notification sent", notification });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};