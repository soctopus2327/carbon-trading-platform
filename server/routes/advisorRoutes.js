// routes/advisorRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fsPromises = require("fs").promises;

const authMiddleware = require("../middleware/authMiddleware");
const advisorController = require("../controllers/advisorController");

const router = express.Router();

// ────────────────────────────────────────────────
//             Multer configuration
// ────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "ai", "uploads");

// Ensure upload directory exists (runs once at startup)
(async () => {
  try {
    await fsPromises.access(UPLOAD_DIR);
  } catch {
    try {
      await fsPromises.mkdir(UPLOAD_DIR, { recursive: true });
      console.log(`Created upload directory: ${UPLOAD_DIR}`);
    } catch (err) {
      console.error("Failed to create upload directory:", err);
    }
  }
})();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${timestamp}-${safeFilename}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// ────────────────────────────────────────────────
//                   Routes
// ────────────────────────────────────────────────

// Conversation history
router.get("/conversations", authMiddleware, advisorController.listConversations);
router.get("/conversations/:id", authMiddleware, advisorController.getConversation);
router.patch("/conversations/:id", authMiddleware, advisorController.updateConversation);
router.delete("/conversations/:id", authMiddleware, advisorController.deleteConversation);

// Chat endpoints (with optional PDF upload)
router.post("/chat", authMiddleware, upload.single("document"), advisorController.chat);
router.post("/chat/stream", authMiddleware, upload.single("document"), advisorController.chatStream);

// Insights
router.get("/insights", authMiddleware, advisorController.getInsights);

// ────────────────────────────────────────────────
//               404 Catch-all (MUST BE LAST)
// ────────────────────────────────────────────────
// Do NOT use router.use("*", ...) — that causes the PathError

router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Advisor route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ────────────────────────────────────────────────
//               Global error handler
// ────────────────────────────────────────────────
router.use((err, req, res, next) => {
  console.error("Advisor route error:", err);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large",
        message: "Maximum file size is 10MB",
      });
    }
    return res.status(400).json({
      success: false,
      error: "Upload error",
      message: err.message || "Invalid file upload",
    });
  }

  // Other errors
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.name || "Server Error",
    message: err.message || "Something went wrong",
  });
});

module.exports = router;