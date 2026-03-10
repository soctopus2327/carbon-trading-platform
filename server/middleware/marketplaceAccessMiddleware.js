const { USER_ROLE } = require("../models/enums");

module.exports = function marketplaceAccessMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const allowedRoles = [USER_ROLE.ADMIN, USER_ROLE.TRADER];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: "Access denied. Marketplace is only available to ADMIN and TRADER roles.",
    });
  }

  next();
};
