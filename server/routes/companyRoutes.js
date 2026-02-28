const express = require("express");

const router = express.Router();

const companyController = require("../controllers/companyController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/dashboard", authMiddleware, companyController.getDashboard);

router.post("/alliance/create", authMiddleware, companyController.createAlliance);

router.post("/alliance/join", authMiddleware, companyController.joinAlliance);

module.exports = router;