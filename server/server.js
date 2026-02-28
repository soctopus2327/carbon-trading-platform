const express = require("express");

const dotenv = require("dotenv");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");

// const txRoutes = require("./routes/transactionRoutes");

// const credRoutes = require("./routes/creditRoutes");

const cmpRoutes = require("./routes/companyRoutes");

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);

// app.use("/transactions", txRoutes);

// app.use("/credit", credRoutes)

app.use("/company", cmpRoutes)

app.listen(5000, () =>
  console.log("Server running")
);