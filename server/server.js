const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");

// const txRoutes = require("./routes/transactionRoutes");

// const credRoutes = require("./routes/creditRoutes");

const cmpRoutes = require("./routes/companyRoutes");
const tradeRoutes = require("./routes/tradeRoutes");

dotenv.config();

connectDB();

const app = express();

// Enable CORS
app.use(cors());

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/trade", tradeRoutes);

// app.use("/transactions", txRoutes);

// app.use("/credit", credRoutes)

app.use("/company", cmpRoutes)
app.listen(5000, () =>
  console.log("Server running")
);