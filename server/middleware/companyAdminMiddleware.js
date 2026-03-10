const { USER_ROLE } = require("../models/enums");

module.exports = function companyAdminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== USER_ROLE.ADMIN || !req.user.company) {
    return res.status(403).json({
      message: "Access denied. Only company admin can manage users."
    });
  }

  next();
};
