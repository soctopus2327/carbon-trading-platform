const User = require("../models/User");
const Company = require("../models/Company");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const { USER_ROLE } = require("../models/enums");
const { sendCompanyRegistrationAlert } = require("../utils/emailService");

// ================= REGISTER COMPANY =================
exports.registerCompany = async (req, res) => {
  try {
    const { companyName, email, password, companyType, initialCredits = 0 } = req.body;

    const company = await Company.create({
      name: companyName,
      totalCredits: Number(initialCredits) || 0,
      carbonCredits: Number(initialCredits) || 0,
      companyType: companyType,
      status: "PENDING"
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: `${companyName}_MASTER`,
      email,
      password: hashedPassword,
      company: company._id,
      role: "ADMIN"
    });

    company.users = [user._id];
    await company.save();

    const token = generateToken(user);

    await sendCompanyRegistrationAlert(company.name, email, companyType);

    res.json({
      token: generateToken(user._id),
      user,           // Keep sending full user (Holdings expects this)
      company
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("company");

    if (!user)
      return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: "Wrong password" });

    if (user.company && user.company.status !== "ACTIVE") {
      let msg = "Your company is not yet approved.";

      if (user.company.status === "PENDING") {
        msg = "Your company registration is pending admin approval. Please wait or contact support.";
      } else if (user.company.status === "REJECTED") {
        msg = "Your company registration was rejected.";
      } else if (user.company.status === "BLOCKED") {
        msg = "Your company has been blocked.";
      }

      return res.status(403).json({ 
        message: msg,
        status: user.company.status 
      });
    }

    const token = generateToken(user);

    const userResponse = {
      ...user.toObject(),
      company: user.company ? user.company._id : null   // ← This is the key fix
    };

    res.json({
      token,
      user: userResponse
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// ================= CREATE SUPER ADMIN =================
exports.createSuperAdmin = async () => {
  try {
    const existing = await User.findOne({ email: "superadmin@platform.com" });

    if (existing) {
      console.log("Super Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("super123", 10);

    await User.create({
      name: "Platform Super Admin",
      email: "superadmin@platform.com",
      password: hashedPassword,
      role: USER_ROLES.SUPER_ADMIN
    });

    console.log("Super Admin created");
  } catch (err) {
    console.error(err.message);
  }
};