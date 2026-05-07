const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  title: { type: String, required: true },

  amount: { type: Number, required: true },

  category: { type: String, required: true },

  type: {
    type: String,
    enum: ["income", "expense"],
    required: true,
  },

  date: { type: Date, required: true },

  receiptImage: { type: String },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);