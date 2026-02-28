const User = require("../models/User");
const Company = require("../models/Company");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

exports.registerCompany = async (req, res) => {

 try {

  const { companyName, email, password, companyType } = req.body;

  // create company

  const company = await Company.create({

   name: companyName,
   totalCredits: 0,
   companyType: companyType

  });

  // create admin user

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
   name: `${companyName}_MASTER`,
   email,
   password: hashedPassword,
   company: company._id,
   role: "ADMIN"

  });

  res.json({

   token: generateToken(user._id),
   user,
   company

  });

 } catch (err) {

  res.status(500).json({ error: err.message });

 }

};

exports.login = async (req, res) => {

 try {

  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user)
   return res.status(400).json("User not found");

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch)
   return res.status(400).json("Wrong password");

  res.json({

   token: generateToken(user._id),
   user

  });

 } catch (err) {

  res.status(500).json(err.message);

 }

};