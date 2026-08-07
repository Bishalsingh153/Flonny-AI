const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDb, getDb } = require('./db');
const { parseExpenseWithGemini, generateFinancialAdviceWithGemini } = require('./aiService');
const { hashPassword, verifyPassword, generateToken, authenticateToken } = require('./authService');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — restrict to allowed origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());


// Initialize database then start server
initDb()
  .then(() => {
    console.log('Database connected and initialized.');
    app.listen(PORT, () => {
      console.log(`Floony backend server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// --- AUTH ROUTES ---

// 1. User Registration
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields: username, email, password' });
  }

  try {
    const db = getDb();
    
    // Check if username or email already exists
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
    const token = generateToken(newUser);

    res.status(201).json({ user: newUser, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 2. User Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing required fields: username, password' });
  }

  try {
    const db = getDb();
    const userRes = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userRes.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const isMatch = verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.json({
      user: { id: user.id, username: user.username, email: user.email },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 3. Get current authenticated user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const userRes = await db.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// --- PROTECTED TRANSACTION & BUDGET ROUTES ---

// 4. Get all transactions (scoped to user)
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const transactionsRes = await db.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, id DESC', [req.user.id]);
    res.json(transactionsRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
});

// 5. Add a transaction (scoped to user)
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { amount, type, category, merchant, date, description } = req.body;
  if (!amount || !type || !category || !date) {
    return res.status(400).json({ error: 'Missing required fields: amount, type, category, date' });
  }

  try {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO transactions (user_id, amount, type, category, merchant, date, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, amount, type, category, merchant || null, date, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// 6. Update a transaction (scoped to user)
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { amount, type, category, merchant, date, description } = req.body;

  try {
    const db = getDb();
    const transactionRes = await db.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    const transaction = transactionRes.rows[0];
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found or access denied' });
    }

    const updatedRes = await db.query(
      `UPDATE transactions SET amount = $1, type = $2, category = $3, merchant = $4, date = $5, description = $6 WHERE id = $7 AND user_id = $8 RETURNING *`,
      [
        amount !== undefined ? amount : transaction.amount,
        type !== undefined ? type : transaction.type,
        category !== undefined ? category : transaction.category,
        merchant !== undefined ? merchant : transaction.merchant,
        date !== undefined ? date : transaction.date,
        description !== undefined ? description : transaction.description,
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

// 7. Delete a transaction (scoped to user)
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const transactionRes = await db.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    const transaction = transactionRes.rows[0];
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found or access denied' });
    }

    await db.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'Transaction deleted successfully', id: parseInt(id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// 8. Get all budgets (scoped to user)
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

// 9. Set / Update a budget (scoped to user)
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

// 10. Parse natural language transaction using AI (protected)
app.post('/api/ai/parse', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing parameter: text' });
  }

  try {
    const parsedData = await parseExpenseWithGemini(text);
    res.json(parsedData);
  } catch (error) {
    console.error('Parsing error:', error);
    res.status(500).json({ error: 'AI failed to parse expense description' });
  }
});

// 11. Chat with financial AI advisor (scoped to user data)
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const { chatHistory } = req.body; // Array of { role: 'user'|'assistant', content: string }
  if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
    return res.status(400).json({ error: 'Missing parameter: chatHistory array' });
  }

  try {
    const db = getDb();
    const transactionsRes = await db.query('SELECT * FROM transactions WHERE user_id = $1', [req.user.id]);
    const budgetsRes = await db.query('SELECT * FROM budgets WHERE user_id = $1', [req.user.id]);
    
    const reply = await generateFinancialAdviceWithGemini(transactionsRes.rows, budgetsRes.rows, chatHistory);
    res.json({ reply });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'AI advisor failed to generate response' });
  }
});
