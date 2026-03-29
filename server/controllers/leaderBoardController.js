const Company = require("../models/Company");

exports.getLeaderboard = async (req, res) => {
  try {

    const leaderboard = await Company.find({ status: "ACTIVE" })
      .sort({ points: -1 })   
      .limit(10)             
      .select("name points carbonCredits");

    res.json(leaderboard);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};