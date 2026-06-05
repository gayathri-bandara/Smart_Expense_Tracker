const Transaction = require("../models/Transaction");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

// ✅ SCAN RECEIPT (AI OCR)
exports.scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No receipt file uploaded." });
    }

    const receiptImage = req.file.filename;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      // 1. GEMINI MULTIMODAL PATH
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePath = req.file.path;
        const imageBuffer = fs.readFileSync(imagePath);

        const imagePart = {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: req.file.mimetype,
          },
        };

        const prompt = `
Analyze this receipt image and extract the following details as accurately as possible:
1. Title: The merchant or vendor name (string). Clean it up (e.g. "Cargills Food City" instead of "Cargills Food City Ltd - Colombo").
2. Amount: The total or grand total paid (number).
3. Category: Choose the best matching category from: Food, Housing, Utilities, Transportation, Entertainment, Medical, Other.
4. Date: The transaction date in YYYY-MM-DD format (string). If the year is not mentioned, use the current year (2026).

Return ONLY a valid JSON object matching the following structure. Do not wrap it in markdown code blocks.
{
  "title": "Merchant Name",
  "amount": 1500.00,
  "category": "Food",
  "date": "2026-06-05"
}
`;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text().trim();

        // Clean potential markdown wrap
        const cleanJSON = responseText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const parsedData = JSON.parse(cleanJSON);

        return res.json({
          title: parsedData.title || "Unknown Vendor",
          amount: Number(parsedData.amount) || 0,
          category: parsedData.category || "Other",
          date: parsedData.date || new Date().toISOString().split("T")[0],
          receiptImage,
        });

      } catch (geminiError) {
        console.error("[GEMINI OCR ERROR] Falling back to demo mode:", geminiError);
      }
    }

    // 2. DEMO MOCK FALLBACK PATH
    return res.json({
      title: "Sample Store",
      amount: 2500.00,
      category: "Food",
      date: new Date().toISOString().split("T")[0],
      receiptImage,
      message: "Demo mode: Set GEMINI_API_KEY for live AI receipt scanning.",
    });

  } catch (error) {
    console.error("[SCAN CONTROLLER ERROR]:", error);
    res.status(500).json({ error: error.message });
  }
};
