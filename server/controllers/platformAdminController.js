const Company = require("../models/Company");
const User = require("../models/User");
const TradeListing = require("../models/TradeListing");
const Transaction = require("../models/Transaction");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

/**
 * POST /platform-admin/auth/login
 * Login for platform admin. Rejects non-PLATFORM_ADMIN users.
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user)
            return res.status(404).json({ message: "User not found" });

        if (user.role !== "PLATFORM_ADMIN")
            return res.status(403).json({ message: "Access denied. Not a Platform Admin." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Wrong password" });

        res.json({
            token: generateToken(user._id),
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /platform-admin/auth/seed
 * One-time route to create the initial Platform Admin account.
 * You should remove or protect this route after first use!
 */
exports.seedPlatformAdmin = async (req, res) => {
    try {
        const { name, email, password, seedSecret } = req.body;

        // Basic guard — set SEED_SECRET in your .env
        if (seedSecret !== process.env.SEED_SECRET) {
            return res.status(403).json({ message: "Invalid seed secret" });
        }

        const existing = await User.findOne({ email });
        if (existing)
            return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "PLATFORM_ADMIN",
            company: null
        });

        res.status(201).json({
            message: "Platform Admin created",
            admin: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────

/**
 * GET /platform-admin/dashboard
 * Returns summary stats for the platform.
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const [
            totalCompanies,
            pendingCompanies,
            activeCompanies,
            rejectedCompanies,
            blockedCompanies,
            totalUsers,
            totalTrades,
            totalTransactions
        ] = await Promise.all([
            Company.countDocuments(),
            Company.countDocuments({ status: "PENDING" }),
            Company.countDocuments({ status: "ACTIVE" }),
            Company.countDocuments({ status: "REJECTED" }),
            Company.countDocuments({ status: "BLOCKED" }),
            User.countDocuments({ role: { $ne: "PLATFORM_ADMIN" } }),
            TradeListing.countDocuments(),
            Transaction.countDocuments()
        ]);

        // Total carbon credits across all active companies
        const creditAgg = await Company.aggregate([
            { $match: { status: "ACTIVE" } },
            { $group: { _id: null, total: { $sum: "$carbonCredits" } } }
        ]);
        const totalCarbonCredits = creditAgg[0]?.total || 0;

        res.json({
            totalCompanies,
            pendingCompanies,
            activeCompanies,
            rejectedCompanies,
            blockedCompanies,
            totalUsers,
            totalTrades,
            totalTransactions,
            totalCarbonCredits
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ─────────────────────────────────────────────
// COMPANY MANAGEMENT
// ─────────────────────────────────────────────

/**
 * GET /platform-admin/companies
 * Returns all companies with filters:
 *   ?status=PENDING|ACTIVE|REJECTED|BLOCKED
 *   ?type=INDIVIDUAL|COMPANY|ALLIANCE
 *   ?search=<name substring>
 *   ?page=1&limit=20
 */
exports.getAllCompanies = async (req, res) => {
    try {
        const { status, type, search, page = 1, limit = 20 } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (type) filter.companyType = type;
        if (search) filter.name = { $regex: search, $options: "i" };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [companies, total] = await Promise.all([
            Company.find(filter)
                .populate("verifiedBy", "name email")
                .populate("parentCompany", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Company.countDocuments(filter)
        ]);

        res.json({
            companies,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /platform-admin/companies/:id
 * Returns full company details including its admin users and recent trades.
 */
exports.getCompanyDetails = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id)
            .populate("verifiedBy", "name email")
            .populate("parentCompany", "name companyType status")
            .populate("allianceMembers", "name status carbonCredits");

        if (!company)
            return res.status(404).json({ message: "Company not found" });

        // Fetch company-level admin users
        const adminUsers = await User.find({
            company: company._id,
            role: "ADMIN"
        }).select("-password");

        // All users in this company
        const allUsers = await User.find({
            company: company._id
        }).select("-password");

        // Recent transactions
        const recentTransactions = await Transaction.find({
            $or: [{ buyerCompany: company._id }, { sellerCompany: company._id }]
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("buyerCompany", "name")
            .populate("sellerCompany", "name");

        res.json({
            company,
            adminUsers,
            allUsers,
            recentTransactions
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUT /platform-admin/companies/:id/approve
 * Approve a pending company — sets status to ACTIVE.
 */
exports.approveCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company)
            return res.status(404).json({ message: "Company not found" });

        if (company.status !== "PENDING")
            return res.status(400).json({ message: `Company is already ${company.status}` });

        company.status = "ACTIVE";
        company.verifiedBy = req.user._id;
        await company.save();

        res.json({
            message: "Company approved successfully",
            company
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUT /platform-admin/companies/:id/reject
 * Reject a pending company — sets status to REJECTED.
 * Body: { reason: "..." }   (optional, stored in aiRecommendation for now)
 */
exports.rejectCompany = async (req, res) => {
    try {
        const { reason } = req.body;

        const company = await Company.findById(req.params.id);

        if (!company)
            return res.status(404).json({ message: "Company not found" });

        if (company.status !== "PENDING")
            return res.status(400).json({ message: `Company is already ${company.status}` });

        company.status = "REJECTED";
        company.verifiedBy = req.user._id;
        if (reason) company.aiRecommendation = `Rejection reason: ${reason}`;
        await company.save();

        res.json({
            message: "Company rejected",
            company
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUT /platform-admin/companies/:id/block
 * Block an active company — sets status to BLOCKED.
 * Body: { reason: "..." }
 */
exports.blockCompany = async (req, res) => {
    try {
        const { reason } = req.body;

        const company = await Company.findById(req.params.id);

        if (!company)
            return res.status(404).json({ message: "Company not found" });

        if (company.status === "BLOCKED")
            return res.status(400).json({ message: "Company is already blocked" });

        company.status = "BLOCKED";
        if (reason) company.aiRecommendation = `Block reason: ${reason}`;
        await company.save();

        res.json({
            message: "Company blocked",
            company
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUT /platform-admin/companies/:id/unblock
 * Reactivate a blocked company — sets status back to ACTIVE.
 */
exports.unblockCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company)
            return res.status(404).json({ message: "Company not found" });

        if (company.status !== "BLOCKED")
            return res.status(400).json({ message: "Company is not blocked" });

        company.status = "ACTIVE";
        await company.save();

        res.json({
            message: "Company unblocked",
            company
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUT /platform-admin/companies/:id/credits
 * Manually adjust carbon credits for a company.
 * Body: { credits: 500, operation: "SET"|"ADD"|"SUBTRACT" }
 */
exports.adjustCredits = async (req, res) => {
    try {
        const { credits, operation = "SET" } = req.body;

        if (typeof credits !== "number" || credits < 0)
            return res.status(400).json({ message: "Invalid credits value" });

        const company = await Company.findById(req.params.id);

        if (!company)
            return res.status(404).json({ message: "Company not found" });

        if (operation === "SET") company.carbonCredits = credits;
        else if (operation === "ADD") company.carbonCredits += credits;
        else if (operation === "SUBTRACT") {
            if (company.carbonCredits < credits)
                return res.status(400).json({ message: "Insufficient credits to subtract" });
            company.carbonCredits -= credits;
        } else {
            return res.status(400).json({ message: "Invalid operation. Use SET, ADD, or SUBTRACT" });
        }

        await company.save();

        res.json({
            message: `Credits ${operation.toLowerCase()} successfully`,
            carbonCredits: company.carbonCredits,
            company
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE /platform-admin/companies/:id
 * Permanently delete a company and all its users.
 * Use with extreme caution!
 */
exports.deleteCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company)
            return res.status(404).json({ message: "Company not found" });

        // Remove all users belonging to this company
        await User.deleteMany({ company: company._id });

        await Company.findByIdAndDelete(req.params.id);

        res.json({ message: "Company and all associated users deleted permanently" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ─────────────────────────────────────────────
// USER (COMPANY ADMIN) MANAGEMENT
// ─────────────────────────────────────────────

/**
 * GET /platform-admin/users
 * Returns all company-level admins across the platform.
 * ?role=ADMIN|TRADER|AUDITOR|VIEWER  (default: ADMIN)
 * ?companyId=<id>
 * ?search=<name or email>
 * ?page=1&limit=20
 */
exports.getAllCompanyAdmins = async (req, res) => {
    try {
        const { role = "ADMIN", companyId, search, page = 1, limit = 20 } = req.query;

        const filter = { role: { $ne: "PLATFORM_ADMIN" } };
        if (role) filter.role = role;
        if (companyId) filter.company = companyId;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("-password")
                .populate("company", "name status companyType")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(filter)
        ]);

        res.json({
            users,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE /platform-admin/users/:id
 * Delete a specific user (cannot delete PLATFORM_ADMIN).
 */
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user)
            return res.status(404).json({ message: "User not found" });

        if (user.role === "PLATFORM_ADMIN")
            return res.status(403).json({ message: "Cannot delete a Platform Admin" });

        await User.findByIdAndDelete(req.params.id);

        res.json({ message: "User deleted successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ─────────────────────────────────────────────
// TRANSACTIONS (READ-ONLY AUDIT)
// ─────────────────────────────────────────────

/**
 * GET /platform-admin/transactions
 * Returns all transactions across the platform.
 * ?page=1&limit=20
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [transactions, total] = await Promise.all([
            Transaction.find()
                .populate("buyerCompany", "name")
                .populate("sellerCompany", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Transaction.countDocuments()
        ]);

        res.json({
            transactions,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};