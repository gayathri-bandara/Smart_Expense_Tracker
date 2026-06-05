const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");
const transactionRoutes = require("./routes/transactionRoutes");
const chatRoutes = require("./routes/chatRoutes");
const path = require("path");

dotenv.config();

const app = express();

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use("/api/transactions", transactionRoutes);
app.use("/api/chat", chatRoutes);

// use routes
app.use("/api/auth", authRoutes);


// make uploads folder public
app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use("/uploads", express.static("uploads"));



app.use((err, req, res, next) => {
  console.error("[GLOBAL ERROR]:", err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

app.get("/", (req, res) => {
  res.send("API running...");
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Server running on port ${PORT}`)
    );
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer(); 