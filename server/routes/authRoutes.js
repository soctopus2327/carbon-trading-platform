const router = require("express").Router();

const authController = require("../controllers/authController");

router.post("/register-company", authController.registerCompany);

router.post("/login", authController.login);

module.exports = router;