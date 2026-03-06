const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const User = require("./models/User");

const authRoutes = require("./routes/authRoutes");
const txRoutes = require("./routes/transactionRoutes");
const cmpRoutes = require("./routes/companyRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const platformAdminRoutes = require("./routes/platformAdminRoutes");
const newsRoutes = require("./routes/newsRoutes");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/trade", tradeRoutes);
app.use("/transactions", txRoutes);
app.use("/company", cmpRoutes);
app.use("/platform-admin", platformAdminRoutes);
app.use("/news", newsRoutes);

async function createPlatformAdmin() {
  try {
    const existing = await User.findOne({ role: "PLATFORM_ADMIN" });
    if (existing) {
      console.log("✅ Platform admin already exists:", existing.email);
      return;
    }

    const hashedPassword = await bcrypt.hash("Desis@2025", 10);
    await User.create({
      name: "Platform Super Admin",
      email: "platformadmin@desis.com",
      password: hashedPassword,
      role: "PLATFORM_ADMIN",
      company: null
    });

    console.log("✅ Platform admin created: platformadmin@desis.com / Desis@2025");
  } catch (err) {
    console.error("❌ Failed to create platform admin:", err.message);
  }
}

async function startServer() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    await createPlatformAdmin();

    app.listen(5000, () => console.log("✅ Server running on port 5000"));
  } catch (err) {
    console.error("❌ Server failed to start:", err.message);
    process.exit(1);
  }
}

startServer();
