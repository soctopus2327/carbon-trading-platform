const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const auditController = require("../controllers/auditController");
const authMiddleware = require("../middleware/authMiddleware");

const uploadDir = path.join(__dirname, "..", "uploads", "audits");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

router.post("/generate", authMiddleware, upload.single("report"), auditController.generateAudit);
router.get("/mine", authMiddleware, auditController.listMyAudits);
router.get("/:id", authMiddleware, auditController.getAuditById);

router.use((err, _req, res, _next) => {
  if (err) {
    return res.status(400).json({ message: err.message || "Audit upload error" });
  }
  return res.status(500).json({ message: "Audit route error" });
});

module.exports = router;
