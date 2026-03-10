const User = require("../models/User");
const Company = require("../models/Company");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const { USER_ROLE } = require("../models/enums");
const { sendCompanyRegistrationAlert } = require("../utils/emailService");

// ================= REGISTER COMPANY =================
exports.registerCompany = async (req, res) => {
  try {
    const { companyName, email, password, companyType } = req.body;

    const company = await Company.create({
      name: companyName,
      totalCredits: 0,
      companyType: companyType
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: `${companyName}_MASTER`,
      email,
      password: hashedPassword,
      company: company._id,
      role: "ADMIN"
    });

    // 4️⃣ Generate token (use user._id like original)
    company.users = [user._id];
    await company.save();

    const token = generateToken(user);

    res.json({
      token: generateToken(user._id),
      user,
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

    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: "Wrong password" });

    const token = generateToken(user);

    res.json({
      token,
      user
    });

  } catch (err) {
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
