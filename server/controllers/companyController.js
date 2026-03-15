const Company = require("../models/Company");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { USER_ROLE } = require("../models/enums");


exports.getDashboard = async (req, res) => {
  try {

    const company = await Company.findById(req.user.company)
      .populate("allianceMembers")
      .populate("parentCompany")
      .populate("verifiedBy");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json(company);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createAlliance = async (req, res) => {
  try {

    const { name } = req.body;

    // Get creator company
    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({
        message: "Company not found"
      });
    }

    // Prevent company already in alliance
    if (company.parentCompany) {
      return res.status(400).json({
        message: "Company already in an alliance"
      });
    }

    // Prevent duplicate alliance name
    const existingAlliance = await Company.findOne({
      name,
      companyType: "ALLIANCE"
    });

    if (existingAlliance) {
      return res.status(400).json({
        message: "Alliance with this name already exists"
      });
    }

    // Create alliance and auto-add creator
    const alliance = await Company.create({
      name,
      companyType: "ALLIANCE",
      allianceMembers: [company._id],
      carbonCredits: 0
    });

    // Update creator company
    company.parentCompany = alliance._id;
    company.status = "MERGED";
    await company.save();

    res.status(201).json({
      message: "Alliance created successfully",
      alliance
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.joinAlliance = async (req, res) => {
  try {

    const { name } = req.body;

    const alliance = await Company.findOne({
      name,
      companyType: "ALLIANCE"
    });

    if (!alliance) {
      return res.status(404).json({
        message: "Alliance not found"
      });
    }

    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({
        message: "Company not found"
      });
    }

    // Prevent joining twice
    if (company.parentCompany) {
      return res.status(400).json({
        message: "Company already in an alliance"
      });
    }

    // Add to alliance
    alliance.allianceMembers.push(company._id);
    await alliance.save();

    // Update company
    company.parentCompany = alliance._id;
    company.status = "MERGED";
    await company.save();

    res.json({
      message: "Joined alliance successfully",
      alliance
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCompanyUsers = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const users = await User.find({
      $or: [
        { company: req.user.company },
        { _id: { $in: company.users || [] } }
      ]
    })
      .select("-password")
      .sort({ createdAt: -1 });

    if (users.length > 0) {
      await Company.updateOne(
        { _id: company._id },
        { $addToSet: { users: { $each: users.map((u) => u._id) } } }
      );
    }

    res.status(200).json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addCompanyUser = async (req, res) => {
  try {
    const { email, role = USER_ROLE.VIEWER, name } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    const allowedRoles = [
      USER_ROLE.ADMIN,
      USER_ROLE.TRADER,
      USER_ROLE.AUDITOR,
      USER_ROLE.VIEWER
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (!existingUser.company || existingUser.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({
          message: "Cannot manage users from another company."
        });
      }

      existingUser.company = req.user.company;
      existingUser.role = role;
      await existingUser.save();
      await Company.updateOne(
        { _id: company._id },
        { $addToSet: { users: existingUser._id } }
      );

      return res.status(200).json({
        message: "User already exists in your company. Role updated.",
        user: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          company: existingUser.company,
          createdAt: existingUser.createdAt
        }
      });
    }

    const displayName =
      name && typeof name === "string" && name.trim()
        ? name.trim()
        : normalizedEmail.split("@")[0];

    const tempPassword = `Temp@${Math.random().toString(36).slice(2, 10)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await User.create({
      name: displayName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      company: req.user.company
    });

    await Company.updateOne(
      { _id: company._id },
      { $addToSet: { users: newUser._id } }
    );

    res.status(201).json({
      message: "User added successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        company: newUser.company,
        createdAt: newUser.createdAt
      },
      tempPassword
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.updateCompanyUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    const allowedRoles = [
      USER_ROLE.ADMIN,
      USER_ROLE.TRADER,
      USER_ROLE.AUDITOR,
      USER_ROLE.VIEWER
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findOne({
      _id: req.params.userId,
      company: req.user.company
    });

    if (!user) {
      return res.status(404).json({ message: "User not found in your company" });
    }

    if (user._id.toString() === req.user._id.toString() && role !== USER_ROLE.ADMIN) {
      return res.status(400).json({ message: "Admin cannot change own role" });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      message: "User role updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeCompanyUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.userId,
      company: req.user.company
    });

    if (!user) {
      return res.status(404).json({ message: "User not found in your company" });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Admin cannot remove itself" });
    }

    await User.findByIdAndDelete(user._id);
    await Company.updateOne(
      { _id: req.user.company },
      { $pull: { users: user._id } }
    );

    res.status(200).json({ message: "User removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getCompanyCredits = async (req, res) => {
  try {
    const companyId = req.params.companyId || req.user.company;
    const company = await Company.findById(companyId).select("carbonCredits name");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({
      companyId: company._id,
      companyName: company.name,
      carbonCredits: company.carbonCredits || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};