const { CATEGORIES, CATEGORY_LIST } = require('./categories');
const { monthBounds, summarizePeriod } = require('./insightsService');

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite'
].filter((name, i, arr) => arr.indexOf(name) === i);

const GEMINI_MODEL = GEMINI_MODELS[0];

const geminiGate = {
  blockedUntil: 0,
  lastReason: '',
  lastModel: GEMINI_MODEL,
  lastCheckAt: 0
};

function getModel(apiKey, modelName = GEMINI_MODEL) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

function hasApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey !== 'YOUR_GEMINI_API_KEY');
}

function parseRetryMs(error) {
  const msg = String(error?.message || error || '');
  const retry = msg.match(/retry in ([\d.]+)\s*s/i);
  let ms = retry ? Math.ceil(Number(retry[1]) * 1000) : 60 * 1000;
  if (/PerDay|free_tier_requests|limit:\s*20/i.test(msg)) {
    ms = Math.max(ms, 15 * 60 * 1000);
  }
  return Math.min(ms, 24 * 60 * 60 * 1000);
}

function markGeminiOk(model) {
  geminiGate.blockedUntil = 0;
  geminiGate.lastReason = '';
  geminiGate.lastModel = model;
  geminiGate.lastCheckAt = Date.now();
}

function markGeminiQuota(error, model) {
  geminiGate.blockedUntil = Date.now() + parseRetryMs(error);
  geminiGate.lastReason = 'quota';
  geminiGate.lastModel = model || geminiGate.lastModel;
  geminiGate.lastCheckAt = Date.now();
}

function checkGeminiAvailability() {
  const configured = hasApiKey();
  const now = Date.now();
  const blocked = configured && now < geminiGate.blockedUntil;
  const retryInSec = blocked ? Math.max(1, Math.ceil((geminiGate.blockedUntil - now) / 1000)) : 0;
  const engine = configured && !blocked ? 'gemini' : 'fallback';
  let label;
  if (!configured) label = 'Ledger (no Gemini key)';
  else if (blocked) {
    const mins = Math.max(1, Math.ceil(retryInSec / 60));
    label = `Ledger fallback · Gemini quota ~${mins}m`;
  } else label = `Gemini (${geminiGate.lastModel})`;
  return {
    configured,
    engine,
    model: geminiGate.lastModel,
    blocked,
    retryInSec,
    reason: blocked ? geminiGate.lastReason : '',
    label,
    checkedAt: geminiGate.lastCheckAt || null
  };
}

function shouldUseGemini() {
  return checkGeminiAvailability().engine === 'gemini';
}

function engineNotice(engine) {
  const st = checkGeminiAvailability();
  if (engine === 'gemini') return `Using Gemini (${st.model}).`;
  if (!st.configured) return 'Gemini is not configured. Answering from your ledger.';
  if (st.retryInSec) {
    const mins = Math.max(1, Math.ceil(st.retryInSec / 60));
    return `Gemini quota is used up. Answering from your ledger. Will try Gemini again in about ${mins} min.`;
  }
  return 'Gemini is unavailable. Answering from your ledger.';
}

async function generateWithGemini(request) {
  if (!shouldUseGemini()) {
    const err = new Error('GEMINI_BLOCKED');
    err.code = 'blocked';
    throw err;
  }
  let lastErr;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = getModel(process.env.GEMINI_API_KEY, modelName);
      const result = await withTimeout(model.generateContent(request), 25000);
      markGeminiOk(modelName);
      return result;
    } catch (error) {
      lastErr = error;
      const msg = String(error?.message || error || '');
      if (/429|quota|Too Many Requests|RESOURCE_EXHAUSTED/i.test(msg)) {
        markGeminiQuota(error, modelName);
        continue;
      }
      if (/404|not found|no longer available/i.test(msg)) continue;
      throw error;
    }
  }
  throw lastErr || new Error('Gemini failed');
}

function parseExpenseTextFallback(text) {
  const cleanText = text.trim();
  const amountMatch = cleanText.match(/(?:₹|rs\.?|inr|\$|usd|€|£)?\s*(\d+(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0.00;

  let type = 'expense';
  const incomeKeywords = ['salary', 'paycheck', 'dividend', 'freelance', 'income', 'earned', 'received', 'bonus'];
  if (incomeKeywords.some((kw) => cleanText.toLowerCase().includes(kw))) {
    type = 'income';
  }

  let category = 'Other';
  const categoryMap = {
    'Food & Dining': ['food', 'eat', 'sushi', 'pizza', 'restaurant', 'coffee', 'starbucks', 'cafe', 'dinner', 'lunch', 'breakfast', 'grocery', 'swiggy', 'zomato'],
    Fuel: ['petrol', 'diesel', 'fuel', 'hp petrol'],
    Transportation: ['uber', 'ola', 'taxi', 'cab', 'bus', 'train', 'metro', 'flight', 'rapido'],
    Shopping: ['amazon', 'flipkart', 'clothes', 'myntra', 'shopping'],
    Entertainment: ['netflix', 'spotify', 'movie', 'pvr', 'concert', 'game'],
    Utilities: ['electricity', 'wifi', 'internet', 'broadband', 'phone bill', 'jio', 'airtel'],
    Rent: ['rent', 'landlord', 'pg'],
    Healthcare: ['pharmacy', 'hospital', 'doctor', 'medicine', 'clinic'],
    Education: ['school', 'college', 'course', 'tuition', 'udemy'],
    Subscriptions: ['subscription', 'prime', 'hotstar', 'youtube premium'],
    Transfers: ['upi', 'transfer', 'sent to', 'imps'],
    Salary: ['salary', 'paycheck', 'payroll'],
    Freelance: ['freelance', 'upwork', 'fiverr', 'gigs']
  };

  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some((kw) => cleanText.toLowerCase().includes(kw))) {
      category = cat;
      break;
    }
  }

  let merchant = '';
  const merchantMatch = cleanText.match(/(?:at|from|to|on|in)\s+([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*)/);
  if (merchantMatch) {
    merchant = merchantMatch[1];
  } else {
    const knownMerchants = ['starbucks', 'uber', 'amazon', 'netflix', 'spotify', 'swiggy', 'zomato', 'flipkart'];
    const textLower = cleanText.toLowerCase();
    const foundMerchant = knownMerchants.find((m) => textLower.includes(m));
    merchant = foundMerchant
      ? foundMerchant.charAt(0).toUpperCase() + foundMerchant.slice(1)
      : type === 'income' ? 'Client' : 'Merchant';
  }

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
    const dateMatch = cleanText.match(/on\s+(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) date = dateMatch[1];
  }

  return {
    amount,
    type,
    category,
    merchant,
    date,
    description: cleanText,
    original_currency: 'INR'
  };
}

function cleanJson(text) {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

function normalizeParsed(parsed) {
  const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'Other';
  return {
    amount: Number(parsed.amount) || 0,
    type: parsed.type === 'income' ? 'income' : 'expense',
    category,
    merchant: parsed.merchant || (parsed.type === 'income' ? 'Client' : 'Merchant'),
    date: parsed.date || new Date().toISOString().split('T')[0],
    description: parsed.description || '',
    original_currency: parsed.original_currency || 'INR',
    original_amount: parsed.original_amount != null ? Number(parsed.original_amount) : undefined,
    split_with: parsed.split_with || ''
  };
}

async function parseExpenseWithGemini(text) {
  if (!shouldUseGemini()) return parseExpenseTextFallback(text);

  try {
    const todayDate = new Date().toISOString().split('T')[0];
    const systemPrompt = `
      You are Floony AI, a smart financial parser for India-first users (INR default).
      Extract transactional details from the user's input.
      Today's date is: ${todayDate}.

      Respond STRICTLY with a JSON object. No markdown.
      {
        "amount": (number, positive, in the currency used in the text; if unspecified assume INR),
        "original_currency": ("INR" | "USD" | "EUR" | "GBP" | "JPY"),
        "type": ("expense" or "income"),
        "category": (must be one of: ${CATEGORY_LIST}),
        "merchant": (string),
        "date": (YYYY-MM-DD),
        "description": (short clean description),
        "split_with": (optional name if they mention splitting a bill, else "")
      }

      User Input: "${text}"
    `;

    const result = await generateWithGemini({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
    });
    const parsed = JSON.parse(cleanJson(result.response.text().trim()));
    const normalized = normalizeParsed(parsed);
    normalized.original_amount = normalized.amount;
    return normalized;
  } catch (error) {
    console.error('Error calling Gemini API for expense parsing:', error.message || error);
    if (isQuotaOrTimeout(error) || error.code === 'blocked') markGeminiQuota(error, geminiGate.lastModel);
    return parseExpenseTextFallback(text);
  }
}

async function parseReceiptWithGemini(buffer, mimeType) {
  const fallback = {
    amount: 0,
    type: 'expense',
    category: 'Other',
    merchant: 'Receipt',
    date: new Date().toISOString().split('T')[0],
    description: 'Could not read receipt',
    original_currency: 'INR'
  };

  if (!shouldUseGemini()) return fallback;

  try {
    const todayDate = new Date().toISOString().split('T')[0];
    const result = await generateWithGemini({
      contents: [{
        role: 'user',
        parts: [
          { text: `You are Floony AI. Read this receipt or UPI/payment screenshot.
Today is ${todayDate}. Extract a single transaction as JSON only:
{
  "amount": number,
  "original_currency": "INR"|"USD"|"EUR"|"GBP"|"JPY",
  "type": "expense"|"income",
  "category": one of [${CATEGORY_LIST}],
  "merchant": string,
  "date": "YYYY-MM-DD",
  "description": string
}` },
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: buffer.toString('base64')
            }
          }
        ]
      }]
    });
    const parsed = JSON.parse(cleanJson(result.response.text().trim()));
    const normalized = normalizeParsed(parsed);
    normalized.original_amount = normalized.amount;
    return normalized;
  } catch (error) {
    console.error('Receipt OCR error:', error);
    return fallback;
  }
}

function profileContext(transactions, budgets, goals) {
  const thisM = monthBounds(0);
  const lastM = monthBounds(-1);
  const current = summarizePeriod(transactions, thisM.start, thisM.end);
  const previous = summarizePeriod(transactions, lastM.start, lastM.end);
  const categoryExpenses = current.byCategory;
  const budgetContext = budgets.map((b) => {
    const spent = categoryExpenses[b.category] || 0;
    const status = spent > b.amount ? 'OVER BUDGET' : 'Within Budget';
    return `- ${b.category}: budget ₹${b.amount}, spent ₹${spent.toFixed(2)} (${status})`;
  }).join('\n');
  const topMerchants = Object.entries(current.byMerchant)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([m, v]) => `- ${m}: ₹${v.toFixed(2)}`)
    .join('\n');
  const goalLines = (goals || []).map((g) =>
    `- ${g.name}: ₹${g.current_amount} / ₹${g.target_amount}${g.deadline ? ` by ${g.deadline}` : ''}`
  ).join('\n');

  return `
This month (${thisM.label}): income ₹${current.income.toFixed(2)}, expenses ₹${current.expense.toFixed(2)}, savings rate ${current.savingsRate}%
Last month: income ₹${previous.income.toFixed(2)}, expenses ₹${previous.expense.toFixed(2)}, savings rate ${previous.savingsRate}%
Budgets:
${budgetContext || '(none)'}
Top merchants this month:
${topMerchants || '(none)'}
Goals:
${goalLines || '(none)'}
`;
}

function querySpend(transactions, args) {
  const start = args.start_date || monthBounds(0).start;
  const end = args.end_date || monthBounds(0).end;
  const filtered = transactions.filter((t) => {
    if (t.date < start || t.date > end) return false;
    if (args.type && t.type !== args.type) return false;
    if (args.category && t.category !== args.category) return false;
    if (args.merchant && !(t.merchant || '').toLowerCase().includes(String(args.merchant).toLowerCase())) return false;
    return true;
  });
  const total = filtered.reduce((s, t) => s + Number(t.amount), 0);
  return {
    count: filtered.length,
    total,
    start,
    end,
    sample: filtered.slice(0, 8).map((t) => `${t.date} ${t.merchant} ${t.type} ₹${t.amount} (${t.category})`)
  };
}

const COACH_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'log_transaction',
        description: 'Propose logging a transaction. User must confirm before it is saved.',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER' },
            type: { type: 'STRING', description: 'expense or income' },
            category: { type: 'STRING' },
            merchant: { type: 'STRING' },
            date: { type: 'STRING' },
            description: { type: 'STRING' }
          },
          required: ['amount', 'type', 'category', 'date']
        }
      },
      {
        name: 'update_budget',
        description: 'Propose updating a monthly category budget. User must confirm.',
        parameters: {
          type: 'OBJECT',
          properties: {
            category: { type: 'STRING' },
            amount: { type: 'NUMBER' }
          },
          required: ['category', 'amount']
        }
      },
      {
        name: 'query_spend',
        description: 'REQUIRED before answering any how-much / spend / income / budget / overspend question. Returns exact ledger totals. Never guess numbers without this.',
        parameters: {
          type: 'OBJECT',
          properties: {
            merchant: { type: 'STRING' },
            category: { type: 'STRING' },
            type: { type: 'STRING' },
            start_date: { type: 'STRING' },
            end_date: { type: 'STRING' }
          }
        }
      }
    ]
  }
];

const PERSONA = `You are Floony, a compact mission robot sitting next to one person — think TARS from Interstellar, not a bank chatbot.
Voice: dry, calm, slightly mechanical, loyal. Humor around seventy percent. Never cute. Never corporate. Never a lecture.
Write for a chat screen:
- 2 to 4 short sentences. Plain speech. No markdown, no bullets, no asterisks, no emoji.
- Ask at most ONE follow-up.
- NEVER invent rupee totals. For how-much / spend / income / budget / overspend, call query_spend first and only quote those numbers. If empty, say the ledger does not have it yet.
- Amounts are INR.
- Don't claim you saved a transaction until they confirm.`;

function looksLikeSpendQuestion(text) {
  return /\b(spend|spent|how much|total|budget|overspend|saving|savings|income|expense|this month|last month|swiggy|zomato)\b/i.test(text || '');
}

function inferSpendArgs(text) {
  const args = {};
  const thisM = monthBounds(0);
  const lastM = monthBounds(-1);
  if (/last month/i.test(text || '')) {
    args.start_date = lastM.start;
    args.end_date = lastM.end;
  } else {
    args.start_date = thisM.start;
    args.end_date = thisM.end;
  }
  if (/\bincome|earned|salary\b/i.test(text || '')) args.type = 'income';
  else if (/\bspend|spent|expense|outflow\b/i.test(text || '')) args.type = 'expense';
  const cats = CATEGORIES.find((c) => (text || '').toLowerCase().includes(c.toLowerCase()));
  if (cats) args.category = cats;
  const merchantMatch = (text || '').match(/(?:on|at|from)\s+([A-Za-z][A-Za-z0-9& ]{1,30})/i);
  if (merchantMatch && !/food|dining|this|last|month/.test(merchantMatch[1].toLowerCase())) {
    args.merchant = merchantMatch[1].trim();
  }
  return args;
}

function buildCoachPrompt(transactions, budgets, chatHistory, goals) {
  const context = profileContext(transactions, budgets, goals);
  const formattedHistory = chatHistory
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-12)
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
  return `${PERSONA}
Categories: ${CATEGORY_LIST}

Ledger snapshot (for orientation only — do not quote these as answers to "how much" questions; call query_spend):
${context}

Chat:
${formattedHistory}

Latest: "${chatHistory[chatHistory.length - 1]?.content || 'Hello'}"`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeApiDump(text) {
  return /GoogleGenerativeAI|Too Many Requests|exceeded your current quota|generateContent|RESOURCE_EXHAUSTED/i.test(String(text || ''));
}

function isQuotaOrTimeout(error) {
  const msg = String(error?.message || error || '');
  return /429|quota|Too Many Requests|RESOURCE_EXHAUSTED|TIMEOUT|no longer available|404|GEMINI_BLOCKED/i.test(msg);
}

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
  ]);
}

async function* yieldTyped(text) {
  const clean = looksLikeApiDump(text)
    ? `Cloud brain is rate limited. I still have the ledger. Ask about this month.`
    : String(text || '');
  yield { type: 'token', text: clean };
}

function generateFinancialAdviceFallback(transactions, budgets, chatHistory) {
  const lastMsg = chatHistory[chatHistory.length - 1]?.content || '';
  const lower = lastMsg.toLowerCase();
  const thisM = monthBounds(0);
  const current = summarizePeriod(transactions, thisM.start, thisM.end);
  const args = inferSpendArgs(lastMsg);
  const stats = querySpend(transactions, args);
  const rupees = `₹${Number(stats.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const logMatch = lower.match(/log\s+(\d+(?:\.\d+)?)\s+(?:for\s+)?(.+)/i);
  if (logMatch) {
    const parsed = parseExpenseTextFallback(lastMsg);
    return {
      reply: `I can put ₹${parsed.amount} at ${parsed.merchant} under ${parsed.category}. Confirm if that is a go.`,
      pendingAction: { type: 'log_transaction', payload: parsed }
    };
  }

  if (/hello|hi |hey|namaste/.test(lower)) {
    return {
      reply: `Floony here. Humor is at seventy percent. Ask about this month, or tell me to log two hundred for coffee.`,
      pendingAction: null
    };
  }

  if (/sip|mutual fund|invest|nps|ppf/i.test(lower)) {
    const surplus = current.income - current.expense;
    return {
      reply: `A thousand rupees a month SIP is a clean start. This month the ledger shows about ₹${Math.max(0, surplus).toFixed(0)} spare so far. Log each SIP as an expense when it leaves the account. Want a recurring reminder for it?`,
      pendingAction: null
    };
  }

  if (looksLikeSpendQuestion(lastMsg)) {
    if (!stats.count) {
      return {
        reply: `I don't have that in your ledger yet for ${args.start_date} to ${args.end_date}. Want to log one now?`,
        pendingAction: null
      };
    }
    return {
      reply: `From the ledger: ${rupees} across ${stats.count} entries in that window. Want me to break it down by merchant?`,
      pendingAction: null
    };
  }

  return {
    reply: `This month you're at ₹${current.expense.toFixed(0)} out and ₹${current.income.toFixed(0)} in — that's from the ledger, not a guess. What do you want to look at first?`,
    pendingAction: null
  };
}

function extractCalls(result) {
  if (typeof result.response.functionCalls === 'function') {
    return result.response.functionCalls() || [];
  }
  return [];
}

async function* yieldEngineReply(engine, reply, pendingAction) {
  const notice = engineNotice(engine);
  yield { type: 'source', engine, notice, status: checkGeminiAvailability() };
  if (pendingAction) yield { type: 'pendingAction', action: pendingAction };
  const clean = looksLikeApiDump(reply)
    ? 'Cloud brain hit a quota wall. I still have the ledger.'
    : String(reply || '');
  yield { type: 'token', text: `${notice}\n\n${clean}` };
}

async function* streamFinancialAdvice(transactions, budgets, chatHistory, goals) {
  const lastMsg = chatHistory[chatHistory.length - 1]?.content || '';
  const fallback = generateFinancialAdviceFallback(transactions, budgets, chatHistory, goals);

  if (!shouldUseGemini()) {
    yield* yieldEngineReply('fallback', fallback.reply, fallback.pendingAction);
    return;
  }

  try {
    const prompt = buildCoachPrompt(transactions, budgets, chatHistory, goals);
    const result = await generateWithGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: COACH_TOOLS
    });
    const call = extractCalls(result)[0];

    if (call && call.name === 'log_transaction') {
      const payload = normalizeParsed(call.args || {});
      payload.original_amount = payload.amount;
      payload.original_currency = payload.original_currency || 'INR';
      yield* yieldEngineReply(
        'gemini',
        `I can log ${payload.amount} rupees at ${payload.merchant || 'that merchant'} under ${payload.category}. Confirm and I will save it.`,
        { type: 'log_transaction', payload }
      );
      return;
    }

    if (call && call.name === 'update_budget') {
      const category = call.args?.category;
      const amount = Number(call.args?.amount) || 0;
      yield* yieldEngineReply(
        'gemini',
        `I can set your ${category} monthly cap to ₹${amount}. Confirm and I'll apply it.`,
        { type: 'update_budget', payload: { category, amount } }
      );
      return;
    }

    if ((call && call.name === 'query_spend') || looksLikeSpendQuestion(lastMsg)) {
      yield* yieldEngineReply('gemini', fallback.reply, null);
      return;
    }

    const full = result.response.text();
    yield* yieldEngineReply('gemini', full, null);
  } catch (error) {
    console.error('Error calling Gemini API for financial advice:', error.message || error);
    if (isQuotaOrTimeout(error) || error.code === 'blocked') {
      if (error.code !== 'blocked') markGeminiQuota(error, geminiGate.lastModel);
    }
    yield* yieldEngineReply('fallback', fallback.reply, fallback.pendingAction);
  }
}

async function generateFinancialAdviceWithGemini(transactions, budgets, chatHistory, goals) {
  let reply = '';
  let pendingAction = null;
  for await (const ev of streamFinancialAdvice(transactions, budgets, chatHistory, goals)) {
    if (ev.type === 'token') reply += ev.text;
    if (ev.type === 'pendingAction') pendingAction = ev.action;
  }
  return { reply, pendingAction };
}

async function generateInsightNarrative(cards) {
  return cards.map((c) => c.body).join(' ');
}

async function generateMonthlyWrapNarrative(stats) {
  return `You moved ₹${stats.expense.toFixed(0)} out and ₹${stats.income.toFixed(0)} in. Savings rate ${stats.savingsRate}%.`;
}

module.exports = {
  parseExpenseWithGemini,
  parseReceiptWithGemini,
  generateFinancialAdviceWithGemini,
  streamFinancialAdvice,
  generateInsightNarrative,
  generateMonthlyWrapNarrative,
  checkGeminiAvailability,
  GEMINI_MODEL
};
