const express = require("express");

const router = express.Router();

const companyController = require("../controllers/companyController");

const authMiddleware = require("../middleware/authMiddleware");
const companyAdminMiddleware = require("../middleware/companyAdminMiddleware");

router.get("/dashboard", authMiddleware, companyController.getDashboard);

router.post("/alliance/create", authMiddleware, companyController.createAlliance);

router.post("/alliance/join", authMiddleware, companyController.joinAlliance);

router.get("/users", authMiddleware, companyAdminMiddleware, companyController.getCompanyUsers);
router.post("/users", authMiddleware, companyAdminMiddleware, companyController.addCompanyUser);
router.put("/users/:userId/role", authMiddleware, companyAdminMiddleware, companyController.updateCompanyUserRole);
router.delete("/users/:userId", authMiddleware, companyAdminMiddleware, companyController.removeCompanyUser);

module.exports = router;
