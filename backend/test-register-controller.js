const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const { registerUser } = require("./controllers/authController");
const connectDB = require("./config/db");

const run = async () => {
  await connectDB();
  const req = {
    body: {
      name: "Alice",
      email: "alice@example.com",
      password: "password123"
    }
  };
  const res = {
    status: function(code) {
      console.log("res.status called with:", code);
      return this;
    },
    json: function(data) {
      console.log("res.json called with:", JSON.stringify(data, null, 2));
      process.exit(0);
    }
  };

  try {
    await registerUser(req, res);
  } catch (err) {
    console.error("Caught outside:", err);
    process.exit(1);
  }
};

run();
