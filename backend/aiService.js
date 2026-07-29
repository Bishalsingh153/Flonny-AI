const { GoogleGenAI } = require('@google/generative-ai');

// Simple regex fallback parser when GEMINI_API_KEY is not configured
function parseExpenseTextFallback(text) {
  console.log('AI API Key not found. Running smart fallback parser.');
  const cleanText = text.trim();
  
  // Extract amount: find decimal numbers or plain numbers, optional dollar sign
  const amountMatch = cleanText.match(/(?:\$|usd)?\s*(\d+(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0.00;

  // Extract type: default to expense unless income keywords present
  let type = 'expense';
  const incomeKeywords = ['salary', 'paycheck', 'dividend', 'freelance', 'income', 'earned', 'received', 'bonus'];
  if (incomeKeywords.some(kw => cleanText.toLowerCase().includes(kw))) {
    type = 'income';
  }

  // Detect category
  let category = 'Other';
  const categoryMap = {
    'Food & Dining': ['food', 'eat', 'sushi', 'pizza', 'restaurant', 'coffee', 'starbucks', 'cafe', 'dinner', 'lunch', 'breakfast', 'grocery', 'groceries', 'burger'],
    'Transportation': ['uber', 'taxi', 'cab', 'bus', 'train', 'gas', 'metro', 'subway', 'flight', 'ticket', 'transport', 'ride'],
    'Shopping': ['amazon', 'clothes', 'shoes', 'jacket', 'gadget', 'online', 'store', 'mall', 'bought', 'shopping', 'iphone', 'laptop'],
    'Entertainment': ['netflix', 'spotify', 'movie', 'concert', 'game', 'gaming', 'steam', 'bar', 'club', 'pub', 'beer', 'drinks', 'hulu', 'disney'],
    'Utilities': ['rent', 'electricity', 'power', 'water', 'gas bill', 'wifi', 'internet', 'broadband', 'phone bill', 'mobile bill', 'insurance'],
    'Salary': ['salary', 'paycheck', 'payroll', 'salary transfer'],
    'Freelance': ['freelance', 'upwork', 'fiverr', 'contract', 'gigs']
  };

  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => cleanText.toLowerCase().includes(kw))) {
      category = cat;
      break;
    }
  }

  // Detect merchant: look for "at [Merchant]", "from [Merchant]", "to [Merchant]", "on [Merchant]"
  let merchant = '';
  const merchantMatch = cleanText.match(/(?:at|from|to|on|in|from)\s+([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*)/);
  if (merchantMatch) {
    merchant = merchantMatch[1];
  } else {
    // Basic fallback: check some known merchants
    const knownMerchants = ['starbucks', 'uber', 'amazon', 'netflix', 'spotify', 'tokyo sushi', 'apple', 'google', 'upwork', 'mcdonalds', 'walmart', 'target'];
    const textLower = cleanText.toLowerCase();
    const foundMerchant = knownMerchants.find(m => textLower.includes(m));
    if (foundMerchant) {
      merchant = foundMerchant.charAt(0).toUpperCase() + foundMerchant.slice(1);
    } else {
      merchant = type === 'income' ? 'Client' : 'Merchant';
    }
  }

  // Detect date: yesterday vs today
  const today = new Date();
  let date = today.toISOString().split('T')[0];
  if (cleanText.toLowerCase().includes('yesterday')) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    date = yesterday.toISOString().split('T')[0];
  } else if (cleanText.toLowerCase().includes('last week')) {
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    date = lastWeek.toISOString().split('T')[0];
  } else {
    // Regex for date format like "on July 1st" or "on 01-07" or "on 2026-07-01" etc.
    const dateMatch = cleanText.match(/on\s+(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
    }
  }

  // Clean description
  let description = cleanText;

  return {
    amount,
    type,
    category,
    merchant,
    date,
    description
  };
}

// Fallback AI Coach Response
function generateFinancialAdviceFallback(transactions, budgets, chatHistory) {
  console.log('AI API Key not found. Running smart fallback financial advice.');
  const lastMsg = chatHistory[chatHistory.length - 1]?.content?.toLowerCase() || '';

  // Calculate totals
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryExpenses = {};

  transactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
    }
  });

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : 0;

  // Find over-budget categories
  const budgetAlerts = [];
  budgets.forEach(b => {
    const spent = categoryExpenses[b.category] || 0;
    if (spent > b.amount) {
      budgetAlerts.push(`${b.category} (spent $${spent.toFixed(2)} of $${b.amount.toFixed(2)})`);
    }
  });

  // Check user questions and reply appropriately
  if (lastMsg.includes('hello') || lastMsg.includes('hi ') || lastMsg.includes('hey')) {
    return `Hello! I'm Floony AI, your personal financial advisor. 👋\n\nI can analyze your spending, help you manage budgets, and offer tips to save money. Currently, you have spent **$${totalExpenses.toFixed(2)}** and earned **$${totalIncome.toFixed(2)}** this month. What can I help you with today?`;
  }

  if (lastMsg.includes('budget') || lastMsg.includes('limit')) {
    if (budgetAlerts.length > 0) {
      return `⚠️ **Budget Alert!** You have exceeded your budget in the following categories:\n` +
        budgetAlerts.map(alert => `- ${alert}`).join('\n') +
        `\n\n*Tip:* Try to cut down on discretionary shopping or dining for the next few days to get back on track.`;
    } else {
      return `Good news! 🎉 You are currently **within budget** for all categories. Keep tracking your expenses to maintain this streak!`;
    }
  }

  if (lastMsg.includes('saving') || lastMsg.includes('save') || lastMsg.includes('invest')) {
    return `Here are some custom savings insights for you:\n\n` +
      `1. **Net Savings:** You have saved **$${netSavings.toFixed(2)}** this period, which is a **${savingsRate}%** savings rate.\n` +
      `2. **Dining Out:** ${categoryExpenses['Food & Dining'] ? `You spent $${categoryExpenses['Food & Dining'].toFixed(2)} on Food & Dining. Packing lunch twice a week could save you around $100/month!` : 'Food & Dining spending is minimal right now, great job!'}\n` +
      `3. **Automate Savings:** Try setting up a direct deposit of 10% of your income straight into a separate savings or investment account before you even see it.`;
  }

  if (lastMsg.includes('spend') || lastMsg.includes('expense') || lastMsg.includes('where did')) {
    const topCategory = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1])[0];
    let topCategoryStr = topCategory ? `Your highest spending category is **${topCategory[0]}** with **$${topCategory[1].toFixed(2)}**.` : 'No expenses recorded yet.';
    return `Here is a summary of your recent spending:\n\n` +
      `- Total Expenses: **$${totalExpenses.toFixed(2)}**\n` +
      `- Total Income: **$${totalIncome.toFixed(2)}**\n` +
      `- Net Savings: **$${netSavings.toFixed(2)}**\n\n` +
      `${topCategoryStr}\n\nWould you like some specific recommendations on how to trim your top expenses?`;
  }

  // Default response
  return `I've analyzed your financial profile. Here's a snapshot of your account:\n\n` +
    `- Total Income: **$${totalIncome.toFixed(2)}**\n` +
    `- Total Expenses: **$${totalExpenses.toFixed(2)}**\n` +
    `- Savings Rate: **${savingsRate}%**\n` +
    (budgetAlerts.length > 0 ? `- ⚠️ Over Budget: **${budgetAlerts.length}** categories\n` : `- ✅ Budgets: All healthy\n`) +
    `\nHow can I assist you further? You can ask me about savings tips, budget alerts, or details about your spending.`;
}

// Main AI Functions using Gemini API (or falling back if API Key is not set)
async function parseExpenseWithGemini(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey === '') {
    return parseExpenseTextFallback(text);
  }

  try {
    const { GoogleGenAI } = require('@google/generative-ai');
    // For @google/generative-ai, standard initialization is:
    // const { GoogleGenAI } = require('@google/generative-ai');
    // wait, the package is usually @google/generative-ai, and we use GoogleGenAI or GoogleGenerativeAI
    // Let's import GoogleGenerativeAI
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const todayDate = new Date().toISOString().split('T')[0];
    const systemPrompt = `
      You are Floony AI, a smart financial parser. Extract transactional details from the user's input.
      Today's date is: ${todayDate}.
      
      Respond STRICTLY with a JSON object. No markdown, no triple backticks. Just the JSON object.
      The JSON object must have exactly these keys:
      {
        "amount": (number, positive value),
        "type": ("expense" or "income"),
        "category": (string, must be one of: "Food & Dining", "Transportation", "Shopping", "Entertainment", "Utilities", "Salary", "Freelance", "Other"),
        "merchant": (string, name of the business or client, or "Merchant"/"Client" if unknown),
        "date": (string, in YYYY-MM-DD format. Calculate relative dates like yesterday, last week, etc. based on today's date: ${todayDate}),
        "description": (string, a short clean description of the transaction)
      }

      User Input: "${text}"
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text().trim();
    
    // Clean up potential markdown formatting in response
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error calling Gemini API for expense parsing:', error);
    return parseExpenseTextFallback(text);
  }
}

async function generateFinancialAdviceWithGemini(transactions, budgets, chatHistory) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey === '') {
    return generateFinancialAdviceFallback(transactions, budgets, chatHistory);
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prepare context
    const recentTransactions = transactions.slice(-15).map(t => 
      `- ${t.date}: ${t.merchant || 'Unknown'} (${t.category}) - ${t.type === 'income' ? '+' : '-'}$${t.amount} [${t.description || ''}]`
    ).join('\n');

    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryExpenses = {};
    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else {
        totalExpenses += t.amount;
        categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
      }
    });

    const budgetContext = budgets.map(b => {
      const spent = categoryExpenses[b.category] || 0;
      const status = spent > b.amount ? 'OVER BUDGET' : 'Within Budget';
      return `- Category: ${b.category}, Budget: $${b.amount}, Spent: $${spent.toFixed(2)} (${status})`;
    }).join('\n');

    const formattedHistory = chatHistory.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const prompt = `
      You are Floony AI, a world-class financial personal advisor. You are integrated into the Floony Expense Tracker.
      You are supportive, insightful, minimalist, and classy in your tone. Keep responses formatting clean (use markdown highlights, bullet points, but keep it concise).
      
      Here is the user's financial profile:
      Total Income: $${totalIncome.toFixed(2)}
      Total Expenses: $${totalExpenses.toFixed(2)}
      Net Savings: $${(totalIncome - totalExpenses).toFixed(2)}
      
      Budget Settings:
      ${budgetContext}
      
      Recent 15 Transactions:
      ${recentTransactions}
      
      Chat History:
      ${formattedHistory}
      
      Respond to the user's latest message: "${chatHistory[chatHistory.length - 1]?.content || 'Hello'}"
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error calling Gemini API for financial advice:', error);
    return generateFinancialAdviceFallback(transactions, budgets, chatHistory);
  }
}

module.exports = {
  parseExpenseWithGemini,
  generateFinancialAdviceWithGemini
};
