const jwt = require("jsonwebtoken");

module.exports = (id) => {

 return jwt.sign({ id }, "secret", {

  expiresIn: "30d"

 });

};