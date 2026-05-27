const Transaction = require("../models/Transaction");

// ✅ CREATE
exports.createTransaction = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const { title, amount, category, type, date } = req.body || {};

    const newTransaction = new Transaction({
      userId: req.user.id,
      title,
      amount,
      category,
      type,
      date,
      receiptImage: req.file ? req.file.filename : null,
    });

    const saved = await newTransaction.save();
    res.status(201).json(saved);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};




// ✅ GET ALL (only logged-in user's data)
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// ✅ GET SINGLE
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Not found" });
    }

    // security check
    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// ✅ UPDATE
exports.updateTransaction = async (req, res) => {
  try {
    let transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Not found" });
    }

    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const updateData = { ...req.body };
    if (req.file) {
      updateData.receiptImage = req.file.filename;
    }

    transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// ✅ DELETE
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Not found" });
    }

    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await transaction.deleteOne();

    res.json({ message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const receiptImage = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const newTransaction = new Transaction({
      userId: req.user.id,
      title: req.body.title,
      amount: req.body.amount,
      category: req.body.category,
      type: req.body.type,
      date: req.body.date,
      receiptImage: req.file ? req.file.filename : null, // save image path
    });

    const saved = await newTransaction.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
