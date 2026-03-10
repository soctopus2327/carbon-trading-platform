const jwt = require("jsonwebtoken");

module.exports = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    "secret",   // we’ll improve this later
    {
      expiresIn: "30d"
    }
  );
};