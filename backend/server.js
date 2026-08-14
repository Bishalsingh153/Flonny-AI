const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const dotenv = require('dotenv');
const { initDb, getDb } = require('./db');
const {
  parseExpenseWithGemini,
  parseReceiptWithGemini,
  generateFinancialAdviceWithGemini,
  streamFinancialAdvice,
  generateInsightNarrative,
  generateMonthlyWrapNarrative,
  checkGeminiAvailability
} = require('./aiService');
const { hashPassword, verifyPassword, generateToken, authenticateToken } = require('./authService');
const { getRates, toInr } = require('./fxService');
const { mapCsvText, duplicateKey } = require('./csvImport');
const {
  monthBounds,
  summarizePeriod,
  computeAnomalyIds,
  detectRecurringSuggestions,
  buildDeterministicInsights
} = require('./insightsService');
const { EXPENSE_CATEGORIES } = require('./categories');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true }));
}

app.use(express.json({ limit: '2mb' }));

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
      else if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    }
  }));
}

initDb()
  .then(() => {
    console.log('Database connected and initialized.');
    app.listen(PORT, () => {
      console.log(`Floony backend server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

async function convertIncomingAmount(body, rates) {
  const displayCurrency = (body.original_currency || body.currency || 'INR').toUpperCase();
  const originalAmount = Number(body.original_amount != null ? body.original_amount : body.amount);
  const amountInr = toInr(originalAmount, displayCurrency, rates);
  return {
    amount: amountInr,
    original_amount: originalAmount,
    original_currency: displayCurrency
  };
}

function txInsertFields(userId, payload) {
  return [
    userId,
    payload.amount,
    payload.type,
    payload.category,
    payload.merchant || null,
    payload.date,
    payload.description || null,
    payload.source || 'manual',
    payload.receipt_url || null,
    payload.original_amount != null ? payload.original_amount : payload.amount,
    payload.original_currency || 'INR',
    payload.split_with || null
  ];
}

const TX_INSERT = `INSERT INTO transactions
  (user_id, amount, type, category, merchant, date, description, source, receipt_url, original_amount, original_currency, split_with)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`;

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields: username, email, password' });
  }
  try {
    const db = getDb();
    const existingUserRes = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existingUserRes.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    const hashedPassword = hashPassword(password);
    const result = await db.query(
      `INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email`,
      [username, email, hashedPassword]
    );
    const newUser = result.rows[0];
    res.status(201).json({ user: newUser, token: generateToken(newUser) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing required fields: username, password' });
  }
  try {
    const db = getDb();
    const userRes = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userRes.rows[0];
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    res.json({
      user: { id: user.id, username: user.username, email: user.email },
      token: generateToken(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const userRes = await db.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

app.get('/api/fx', authenticateToken, async (req, res) => {
  try {
    const rates = await getRates();
    res.json({ base: 'INR', rates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load FX rates' });
  }
});

app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const transactionsRes = await db.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, id DESC',
      [req.user.id]
    );
    const anomalyIds = computeAnomalyIds(transactionsRes.rows);
    res.json(transactionsRes.rows.map((t) => ({ ...t, is_anomaly: anomalyIds.has(t.id) })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
});

app.get('/api/transactions/export', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const { rows } = await db.query(
      'SELECT date, type, category, merchant, amount, original_amount, original_currency, description, split_with, source FROM transactions WHERE user_id = $1 ORDER BY date DESC, id DESC',
      [req.user.id]
    );
    const header = 'date,type,category,merchant,amount,original_amount,original_currency,description,split_with,source';
    const lines = rows.map((r) =>
      [r.date, r.type, r.category, r.merchant, r.amount, r.original_amount, r.original_currency, r.description, r.split_with, r.source]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="floony-transactions.csv"');
    res.send([header, ...lines].join('\n'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Export failed' });
  }
});

app.post('/api/transactions/import/preview', authenticateToken, async (req, res) => {
  try {
    const csv = req.body.csv;
    if (!csv) return res.status(400).json({ error: 'Missing csv text' });
    const mapped = mapCsvText(csv);
    const db = getDb();
    const existing = await db.query('SELECT date, amount, merchant, type FROM transactions WHERE user_id = $1', [req.user.id]);
    const existingKeys = new Set(existing.rows.map(duplicateKey));
    const seen = new Set();
    const preview = mapped.map((row) => {
      const key = duplicateKey(row);
      const duplicate = existingKeys.has(key) || seen.has(key);
      seen.add(key);
      return { ...row, duplicate };
    });
    res.json({ rows: preview, total: preview.length, duplicates: preview.filter((r) => r.duplicate).length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to parse CSV' });
  }
});

app.post('/api/transactions/import', authenticateToken, async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Missing rows array' });
  }
  try {
    const db = getDb();
    const rates = await getRates();
    const created = [];
    for (const row of rows) {
      if (row.duplicate || row.skip) continue;
      const fx = await convertIncomingAmount({ ...row, original_currency: row.original_currency || 'INR' }, rates);
      const result = await db.query(TX_INSERT, txInsertFields(req.user.id, {
        ...row,
        ...fx,
        source: 'import'
      }));
      created.push(result.rows[0]);
    }
    res.status(201).json({ created: created.length, transactions: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Import failed' });
  }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { amount, type, category, date } = req.body;
  if (!amount || !type || !category || !date) {
    return res.status(400).json({ error: 'Missing required fields: amount, type, category, date' });
  }
  try {
    const rates = await getRates();
    const fx = await convertIncomingAmount(req.body, rates);
    const db = getDb();
    const result = await db.query(TX_INSERT, txInsertFields(req.user.id, { ...req.body, ...fx }));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const transactionRes = await db.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    const transaction = transactionRes.rows[0];
    if (!transaction) return res.status(404).json({ error: 'Transaction not found or access denied' });

    const rates = await getRates();
    const merged = { ...transaction, ...req.body };
    const fx = await convertIncomingAmount(merged, rates);

    const updatedRes = await db.query(
      `UPDATE transactions SET
        amount = $1, type = $2, category = $3, merchant = $4, date = $5, description = $6,
        original_amount = $7, original_currency = $8, split_with = $9, source = $10
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [
        fx.amount,
        merged.type,
        merged.category,
        merged.merchant || null,
        merged.date,
        merged.description || null,
        fx.original_amount,
        fx.original_currency,
        merged.split_with || null,
        merged.source || transaction.source,
        id,
        req.user.id
      ]
    );
    res.json(updatedRes.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const transactionRes = await db.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!transactionRes.rows[0]) return res.status(404).json({ error: 'Transaction not found or access denied' });
    await db.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'Transaction deleted successfully', id: parseInt(id, 10) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

app.get('/api/budgets', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const budgetsRes = await db.query('SELECT * FROM budgets WHERE user_id = $1', [req.user.id]);
    res.json(budgetsRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve budgets' });
  }
});

app.post('/api/budgets', authenticateToken, async (req, res) => {
  const { category, amount, period } = req.body;
  if (!category || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields: category, amount' });
  }
  try {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO budgets (category, user_id, amount, period)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (category, user_id)
       DO UPDATE SET amount = EXCLUDED.amount, period = EXCLUDED.period
       RETURNING *`,
      [category, req.user.id, amount, period || 'monthly']
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to set budget' });
  }
});

app.get('/api/ai/status', authenticateToken, async (req, res) => {
  res.json(checkGeminiAvailability());
});

app.post('/api/ai/parse', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing parameter: text' });
  try {
    const parsedData = await parseExpenseWithGemini(text);
    parsedData.source = 'nl';
    res.json(parsedData);
  } catch (error) {
    console.error('Parsing error:', error);
    res.status(500).json({ error: 'AI failed to parse expense description' });
  }
});

app.post('/api/ai/parse-receipt', authenticateToken, upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing receipt image' });
  try {
    const parsed = await parseReceiptWithGemini(req.file.buffer, req.file.mimetype);
    parsed.source = 'receipt';
    res.json(parsed);
  } catch (error) {
    console.error('Receipt parse error:', error);
    res.status(500).json({ error: 'Failed to read receipt' });
  }
});

app.get('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const { rows } = await db.query(
      'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY id ASC',
      [req.user.id]
    );
    res.json({ messages: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load chat' });
  }
});

app.delete('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    await db.query('DELETE FROM chat_messages WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
});

app.post('/api/ai/chat/local', authenticateToken, async (req, res) => {
  const user = String(req.body?.user || '').trim();
  const assistant = String(req.body?.assistant || '').trim();
  if (!user || !assistant) return res.status(400).json({ error: 'Missing messages' });
  try {
    const db = getDb();
    await db.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)', [req.user.id, 'user', user]);
    await db.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)', [req.user.id, 'assistant', assistant]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save chat' });
  }
});

app.post('/api/ai/chat/stream', authenticateToken, async (req, res) => {
  const { chatHistory } = req.body;
  if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
    return res.status(400).json({ error: 'Missing parameter: chatHistory array' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const db = getDb();
    const lastUser = [...chatHistory].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      await db.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)', [
        req.user.id,
        'user',
        lastUser.content
      ]);
    }
    const [transactionsRes, budgetsRes, goalsRes] = await Promise.all([
      db.query('SELECT * FROM transactions WHERE user_id = $1', [req.user.id]),
      db.query('SELECT * FROM budgets WHERE user_id = $1', [req.user.id]),
      db.query('SELECT * FROM goals WHERE user_id = $1', [req.user.id])
    ]);

    let reply = '';
    for await (const ev of streamFinancialAdvice(
      transactionsRes.rows,
      budgetsRes.rows,
      chatHistory,
      goalsRes.rows
    )) {
      if (ev.type === 'token') reply += ev.text;
      send(ev);
    }

    await db.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)', [
      req.user.id,
      'assistant',
      reply || ' '
    ]);
    send({ type: 'done' });
    res.end();
  } catch (error) {
    console.error('AI chat stream error:', error);
    send({ type: 'error', message: 'AI advisor failed to generate response' });
    res.end();
  }
});

app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const { chatHistory } = req.body;
  if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
    return res.status(400).json({ error: 'Missing parameter: chatHistory array' });
  }
  try {
    const db = getDb();
    const lastUser = [...chatHistory].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      await db.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)', [
        req.user.id,
        'user',
        lastUser.content
      ]);
    }
    const [transactionsRes, budgetsRes, goalsRes] = await Promise.all([
      db.query('SELECT * FROM transactions WHERE user_id = $1', [req.user.id]),
      db.query('SELECT * FROM budgets WHERE user_id = $1', [req.user.id]),
      db.query('SELECT * FROM goals WHERE user_id = $1', [req.user.id])
    ]);
    const result = await generateFinancialAdviceWithGemini(
      transactionsRes.rows,
      budgetsRes.rows,
      chatHistory,
      goalsRes.rows
    );
    await db.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)', [
      req.user.id,
      'assistant',
      result.reply
    ]);
    res.json({ reply: result.reply, pendingAction: result.pendingAction || null });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'AI advisor failed to generate response' });
  }
});

app.post('/api/ai/confirm-action', authenticateToken, async (req, res) => {
  const { action } = req.body;
  if (!action || !action.type) return res.status(400).json({ error: 'Missing action' });
  try {
    const db = getDb();
    if (action.type === 'log_transaction') {
      const rates = await getRates();
      const fx = await convertIncomingAmount({ ...action.payload, original_currency: action.payload.original_currency || 'INR' }, rates);
      const result = await db.query(TX_INSERT, txInsertFields(req.user.id, {
        ...action.payload,
        ...fx,
        source: 'coach'
      }));
      return res.json({ ok: true, transaction: result.rows[0] });
    }
    if (action.type === 'update_budget') {
      const { category, amount } = action.payload;
      const result = await db.query(
        `INSERT INTO budgets (category, user_id, amount, period)
         VALUES ($1, $2, $3, 'monthly')
         ON CONFLICT (category, user_id)
         DO UPDATE SET amount = EXCLUDED.amount
         RETURNING *`,
        [category, req.user.id, amount]
      );
      return res.json({ ok: true, budget: result.rows[0] });
    }
    return res.status(400).json({ error: 'Unknown action type' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to confirm action' });
  }
});

app.get('/api/insights', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const cached = await db.query('SELECT payload, cache_date FROM insights_cache WHERE user_id = $1', [req.user.id]);
    if (cached.rows[0] && cached.rows[0].cache_date === today) {
      return res.json(cached.rows[0].payload);
    }
    const [tx, budgets] = await Promise.all([
      db.query('SELECT * FROM transactions WHERE user_id = $1', [req.user.id]),
      db.query('SELECT * FROM budgets WHERE user_id = $1', [req.user.id])
    ]);
    const det = buildDeterministicInsights(tx.rows, budgets.rows);
    const narrative = await generateInsightNarrative(det.cards);
    const payload = {
      cards: det.cards,
      narrative,
      generatedAt: today
    };
    await db.query(
      `INSERT INTO insights_cache (user_id, cache_date, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET cache_date = EXCLUDED.cache_date, payload = EXCLUDED.payload`,
      [req.user.id, today, payload]
    );
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to build insights' });
  }
});

app.get('/api/recurring', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const { rows } = await db.query('SELECT * FROM recurring_rules WHERE user_id = $1 ORDER BY next_date ASC', [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load recurring rules' });
  }
});

app.get('/api/recurring/suggestions', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const tx = await db.query('SELECT * FROM transactions WHERE user_id = $1', [req.user.id]);
    const rules = await db.query('SELECT merchant FROM recurring_rules WHERE user_id = $1', [req.user.id]);
    const known = new Set(rules.rows.map((r) => r.merchant.toLowerCase()));
    const suggestions = detectRecurringSuggestions(tx.rows).filter((s) => !known.has(s.merchant.toLowerCase()));
    res.json(suggestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to detect recurrences' });
  }
});

app.post('/api/recurring', authenticateToken, async (req, res) => {
  const { merchant, amount, category, cadence, next_date, description } = req.body;
  if (!merchant || amount === undefined || !category || !next_date) {
    return res.status(400).json({ error: 'Missing recurring fields' });
  }
  try {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO recurring_rules (user_id, merchant, amount, category, cadence, next_date, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, merchant, amount, category, cadence || 'monthly', next_date, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save recurring rule' });
  }
});

app.delete('/api/recurring/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    await db.query('DELETE FROM recurring_rules WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

app.post('/api/recurring/:id/log', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const ruleRes = await db.query('SELECT * FROM recurring_rules WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const rule = ruleRes.rows[0];
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const result = await db.query(TX_INSERT, txInsertFields(req.user.id, {
      amount: rule.amount,
      original_amount: rule.amount,
      original_currency: 'INR',
      type: 'expense',
      category: rule.category,
      merchant: rule.merchant,
      date,
      description: rule.description || `Recurring ${rule.cadence} ${rule.merchant}`,
      source: 'recurring'
    }));
    const next = new Date(rule.next_date);
    if (rule.cadence === 'weekly') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    const nextDate = next.toISOString().split('T')[0];
    await db.query('UPDATE recurring_rules SET next_date = $1 WHERE id = $2', [nextDate, rule.id]);
    res.status(201).json({ transaction: result.rows[0], next_date: nextDate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log recurrence' });
  }
});

app.get('/api/goals', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const { rows } = await db.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load goals' });
  }
});

app.post('/api/goals', authenticateToken, async (req, res) => {
  const { name, target_amount, current_amount, deadline } = req.body;
  if (!name || target_amount === undefined) return res.status(400).json({ error: 'Missing goal fields' });
  try {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO goals (user_id, name, target_amount, current_amount, deadline)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, name, target_amount, current_amount || 0, deadline || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

app.put('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.query('SELECT * FROM goals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const g = existing.rows[0];
    if (!g) return res.status(404).json({ error: 'Goal not found' });
    const result = await db.query(
      `UPDATE goals SET name = $1, target_amount = $2, current_amount = $3, deadline = $4
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [
        req.body.name ?? g.name,
        req.body.target_amount ?? g.target_amount,
        req.body.current_amount ?? g.current_amount,
        req.body.deadline ?? g.deadline,
        req.params.id,
        req.user.id
      ]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

app.delete('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    await db.query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

app.get('/api/wrap', authenticateToken, async (req, res) => {
  try {
    const month = req.query.month || monthBounds(0).label;
    const [year, mo] = month.split('-').map(Number);
    const start = `${month}-01`;
    const last = new Date(year, mo, 0).toISOString().split('T')[0];
    const db = getDb();
    const tx = await db.query('SELECT * FROM transactions WHERE user_id = $1', [req.user.id]);
    const stats = summarizePeriod(tx.rows, start, last);
    const payload = {
      month,
      income: stats.income,
      expense: stats.expense,
      savings: stats.savings,
      savingsRate: stats.savingsRate,
      topCategory: stats.topCategory ? stats.topCategory[0] : null,
      topCategoryAmount: stats.topCategory ? stats.topCategory[1] : 0,
      topMerchant: stats.topMerchant ? stats.topMerchant[0] : null,
      transactionCount: stats.rows.length,
      byCategory: stats.byCategory
    };
    payload.narrative = await generateMonthlyWrapNarrative(payload);
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to build monthly wrap' });
  }
});

app.get('/api/meta/categories', authenticateToken, (req, res) => {
  res.json({ expense: EXPENSE_CATEGORIES });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use((req, res) => {
    if (req.path.startsWith('/api/') || path.extname(req.path)) {
      return res.status(404).send('Not found');
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
