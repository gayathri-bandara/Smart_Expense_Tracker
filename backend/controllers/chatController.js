const Transaction = require("../models/Transaction");
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required and must be a string." });
    }

    // Retrieve all transactions for the user
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      // 1. GEMINI LLM PATH
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Build transaction summary context to avoid token bloat
        const summaryContext = transactions.map(t => ({
          title: t.title,
          amount: t.amount,
          category: t.category,
          type: t.type,
          date: t.date ? new Date(t.date).toISOString().split('T')[0] : '—'
        }));

        const prompt = `
You are an expert personal financial advisor and chatbot embedded in a "Smart Expense Tracker" mobile app.
Your name is "Smart Finance AI".
Here is the user's transaction history:
${JSON.stringify(summaryContext, null, 2)}

User's Query: "${message}"

Guidelines:
1. Provide a direct, friendly, and expert response.
2. Refer to currency in Sri Lankan Rupees (Rs. or LKR) unless the user specifies otherwise.
3. Keep answers clear and digestible for a mobile app screen. Use bullet points for lists.
4. Offer proactive budget tips or savings suggestions if relevant.
5. If the user asks for something outside of finance or expense tracking, politely redirect them back to financial matters.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.json({ reply: text.trim() });
      } catch (geminiError) {
        console.error("[GEMINI ERROR] Falling back to local parser:", geminiError);
        // Fall through to local rule-based engine on API error
      }
    }

    // 2. LOCAL RULE-BASED FALLBACK PATH
    const normalizedMessage = message.toLowerCase().trim();
    let reply = "";

    // Aggregates
    let totalExpense = 0;
    let totalIncome = 0;
    const categoryTotals = {};
    let highestExpense = null;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === "expense") {
        totalExpense += amt;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
        if (!highestExpense || amt > highestExpense.amount) {
          highestExpense = t;
        }
      } else if (t.type === "income") {
        totalIncome += amt;
      }
    });

    const netBalance = totalIncome - totalExpense;

    // Check queries
    if (
      normalizedMessage.includes("highest") ||
      normalizedMessage.includes("max") ||
      normalizedMessage.includes("biggest") ||
      normalizedMessage.includes("most expensive")
    ) {
      if (!highestExpense) {
        reply = "You have not recorded any expenses yet!";
      } else {
        const dateStr = highestExpense.date ? new Date(highestExpense.date).toLocaleDateString() : "—";
        reply = `Your single highest expense is **"${highestExpense.title}"**:\n• **Amount**: Rs. ${highestExpense.amount.toFixed(2)}\n• **Category**: ${highestExpense.category}\n• **Date**: ${dateStr}`;
      }
    } else if (
      normalizedMessage.includes("category") ||
      normalizedMessage.includes("breakdown") ||
      normalizedMessage.includes("categories") ||
      normalizedMessage.includes("chart")
    ) {
      const categories = Object.keys(categoryTotals);
      if (categories.length === 0) {
        reply = "You haven't recorded any expenses yet to group by category!";
      } else {
        reply = "Here is your expense breakdown by category:\n";
        categories.forEach(cat => {
          const pct = ((categoryTotals[cat] / totalExpense) * 100).toFixed(1);
          reply += `• **${cat}**: Rs. ${categoryTotals[cat].toFixed(2)} (${pct}%)\n`;
        });
      }
    } else if (
      normalizedMessage.includes("total") ||
      normalizedMessage.includes("summary") ||
      normalizedMessage.includes("how much") ||
      normalizedMessage.includes("spent") ||
      normalizedMessage.includes("balance") ||
      normalizedMessage.includes("income") ||
      normalizedMessage.includes("expense")
    ) {
      reply = `Here is your transaction summary:
• **Total Transactions**: ${transactions.length}
• **Total Income**: Rs. ${totalIncome.toFixed(2)}
• **Total Expenses**: Rs. ${totalExpense.toFixed(2)}
• **Net Balance**: Rs. ${netBalance.toFixed(2)} ${netBalance >= 0 ? "📈" : "⚠️"}`;

      if (totalExpense > totalIncome) {
        reply += "\n\n*Budget Tip: Your expenses exceed your income this period. Consider reviewing non-essential spending.*";
      }
    } else if (
      normalizedMessage.includes("tip") ||
      normalizedMessage.includes("advice") ||
      normalizedMessage.includes("save") ||
      normalizedMessage.includes("saving") ||
      normalizedMessage.includes("budget")
    ) {
      const tips = [
        "Try the **50/30/20 budget rule**: allocate 50% of income to Needs, 30% to Wants, and 20% to Savings.",
        "Always review subscriptions. Check for unused streaming services or gym memberships that charge monthly.",
        "Avoid emotional shopping. Before buying non-essential items, wait 48 hours to see if you still want them.",
        "Create a visual savings goal. Seeing progress toward a target (like a holiday or emergency fund) increases motivation."
      ];

      // Dynamic tip based on top category
      const categories = Object.keys(categoryTotals);
      if (categories.length > 0) {
        let topCat = categories[0];
        categories.forEach(cat => {
          if (categoryTotals[cat] > categoryTotals[topCat]) {
            topCat = cat;
          }
        });
        tips.push(`Your highest spending is on **${topCat}** (Rs. ${categoryTotals[topCat].toFixed(2)}). Reducing your ${topCat} expenses by just 10% would save you Rs. ${(categoryTotals[topCat] * 0.1).toFixed(2)}!`);
      }

      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      reply = `💡 **Smart Financial Tip**:\n${randomTip}`;
    } else {
      reply = `Hello! I'm your **Smart Finance AI**. 🤖
      
I can analyze your financial habits! Ask me:
• *"How much did I spend in total?"*
• *"Show my category breakdown"*
• *"What is my highest expense?"*
• *"Give me a budget tip"*

_Note: For full natural language AI conversations, configure the \`GEMINI_API_KEY\` on the backend environment._`;
    }

    res.json({ reply });

  } catch (error) {
    console.error("[CHAT CONTROLLER ERROR]:", error);
    res.status(500).json({ error: error.message });
  }
};
