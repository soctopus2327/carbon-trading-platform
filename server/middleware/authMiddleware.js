const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {

    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, "secret");
        req.user = await User.findById(decoded.id);
        next();

    } catch(error) {
        console.log(error.message);
        res.status(401).json("Not authorized");

    }

};