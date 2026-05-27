const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// ✅ Import controllers FIRST (important)
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");

// ✅ PROTECT ALL ROUTES FIRST
router.use(authMiddleware);

// ✅ ROUTES

// CREATE (with image upload)
router.post("/", upload.single("receipt"), createTransaction);

// READ all
router.get("/", getTransactions);

// READ one
router.get("/:id", getTransactionById);

// UPDATE
router.put("/:id", upload.single("receipt"), updateTransaction);

// DELETE
router.delete("/:id", deleteTransaction);

module.exports = router;
