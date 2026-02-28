const Company = require("../models/Company");


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