import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  LayoutDashboard,
  ReceiptText,
  Bot,
  Wallet,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Send,
  Check,
  X,
  AlertTriangle,
  PiggyBank,
  ChevronRight,
  LogOut,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';

const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Salary',
  'Freelance',
  'Other'
];

const CURRENCIES = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥'
};

function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('floony_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('floony_user')) || null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authFormData, setAuthFormData] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Currency State (Default to INR)
  const [currency, setCurrency] = useState(localStorage.getItem('floony_currency') || 'INR');

  // Core Application State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  
  // AI Parsing State
  const [aiInput, setAiInput] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);

  // AI Chat State
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm Floony AI, your personal financial advisor. Ask me questions like:\n- *'Am I spending too much on food?'*\n- *'Give me 3 tips to save money'* \n- *'Analyze my spending habits'*."
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiChatting, setIsAiChatting] = useState(false);
  const chatEndRef = useRef(null);

  // CRUD Transaction States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: 'Food & Dining',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Filter States (Transactions page)
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Status Check
  const [aiStatus, setAiStatus] = useState('Checking...');

  // Helper for requests with auth header
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error('Unauthorized or expired session');
    }
    return res;
  };

  // Load Transactions & Budgets
  const fetchData = async () => {
    if (!token) return;
    try {
      const tRes = await authFetch(`${API_BASE}/transactions`);
      const tData = await tRes.json();
      setTransactions(tData);

      const bRes = await authFetch(`${API_BASE}/budgets`);
      const bData = await bRes.json();
      setBudgets(bData);
    } catch (error) {
      console.error('Error fetching ledger data:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      checkAiStatus();
    }
  }, [token]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const checkAiStatus = async () => {
    try {
      const res = await authFetch(`${API_BASE}/ai/parse`, {
        method: 'POST',
        body: JSON.stringify({ text: 'test' })
      });
      setAiStatus('Operational');
    } catch (e) {
      setAiStatus('Offline');
    }
  };

  // Trigger Confetti
  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#8b5cf6', '#10b981']
    });
  };

  // Auth Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    const url = authMode === 'login' 
      ? `${API_BASE}/auth/login` 
      : `${API_BASE}/auth/register`;

    const body = authMode === 'login'
      ? { username: authFormData.username, password: authFormData.password }
      : authFormData;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save to localStorage
      localStorage.setItem('floony_token', data.token);
      localStorage.setItem('floony_user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      setAuthFormData({ username: '', email: '', password: '' });
      triggerCelebration();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('floony_token');
    localStorage.removeItem('floony_user');
    setToken(null);
    setUser(null);
    setTransactions([]);
    setBudgets([]);
    setChatHistory([
      {
        role: 'assistant',
        content: "Hello! I'm Floony AI, your personal financial advisor. Ask me questions like:\n- *'Am I spending too much on food?'*\n- *'Give me 3 tips to save money'* \n- *'Analyze my spending habits'*."
      }
    ]);
  };

  // AI Parsing Handler
  const handleAiParse = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    setIsAiParsing(true);
    try {
      const res = await authFetch(`${API_BASE}/ai/parse`, {
        method: 'POST',
        body: JSON.stringify({ text: aiInput })
      });
      const data = await res.json();
      setAiPreview(data);
    } catch (error) {
      console.error('AI parsing error:', error);
    } finally {
      setIsAiParsing(false);
    }
  };

  // Approve AI Parsed Transaction
  const handleApproveAiPreview = async () => {
    if (!aiPreview) return;
    try {
      const res = await authFetch(`${API_BASE}/transactions`, {
        method: 'POST',
        body: JSON.stringify(aiPreview)
      });
      const newTx = await res.json();
      setTransactions([newTx, ...transactions]);
      setAiPreview(null);
      setAiInput('');
      triggerCelebration();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  // AI Chat Handler
  const handleAiChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsAiChatting(true);

    try {
      const res = await authFetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({ chatHistory: updatedHistory })
      });
      const data = await res.json();
      setChatHistory([...updatedHistory, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setChatHistory([...updatedHistory, { role: 'assistant', content: 'Oops! I encountered an error connecting to my core brain. Please try again.' }]);
    } finally {
      setIsAiChatting(false);
    }
  };

  // Add / Edit Transaction Manual Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    try {
      let res;
      if (editingTransaction) {
        res = await authFetch(`${API_BASE}/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          body: JSON.stringify(dataToSend)
        });
        const updated = await res.json();
        setTransactions(transactions.map(t => t.id === updated.id ? updated : t));
      } else {
        res = await authFetch(`${API_BASE}/transactions`, {
          method: 'POST',
          body: JSON.stringify(dataToSend)
        });
        const created = await res.json();
        setTransactions([created, ...transactions]);
        triggerCelebration();
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await authFetch(`${API_BASE}/transactions/${id}`, {
        method: 'DELETE'
      });
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  // Open Edit Modal
  const openEditModal = (t) => {
    setEditingTransaction(t);
    setFormData({
      amount: t.amount.toString(),
      type: t.type,
      category: t.category,
      merchant: t.merchant || '',
      date: t.date,
      description: t.description || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      amount: '',
      type: 'expense',
      category: 'Food & Dining',
      merchant: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
  };

  // Budget Adjuster
  const handleBudgetChange = async (category, amount) => {
    try {
      const res = await authFetch(`${API_BASE}/budgets`, {
        method: 'POST',
        body: JSON.stringify({ category, amount: parseFloat(amount) })
      });
      const updated = await res.json();
      
      const exists = budgets.some(b => b.category === category);
      if (exists) {
        setBudgets(budgets.map(b => b.category === category ? updated : b));
      } else {
        setBudgets([...budgets, updated]);
      }
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const currentCurrencySymbol = CURRENCIES[currency] || '₹';

  // Calculations for dashboard
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Food & Dining': return 'badge-food';
      case 'Transportation': return 'badge-trans';
      case 'Shopping': return 'badge-shop';
      case 'Entertainment': return 'badge-ent';
      case 'Utilities': return 'badge-util';
      case 'Salary': return 'badge-sal';
      case 'Freelance': return 'badge-free';
      default: return 'badge-other';
    }
  };

  // Totals calculations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Chart 1: Spend by Category
  const categorySpendMap = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categorySpendMap[t.category] = (categorySpendMap[t.category] || 0) + t.amount;
    });

  const categorySpendData = Object.entries(categorySpendMap).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2))
  })).sort((a, b) => b.value - a.value);

  // Chart 2: Monthly Spending Trend (aggregated by date)
  const dateSpendMap = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      dateSpendMap[t.date] = (dateSpendMap[t.date] || 0) + t.amount;
    });

  const trendData = Object.entries(dateSpendMap)
    .map(([date, amount]) => ({
      date: date.substring(5), // Just MM-DD
      amount: parseFloat(amount.toFixed(2)),
      rawDate: date
    }))
    .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
    .slice(-10); // Last 10 days of activity

  const COLORS = {
    'Food & Dining': '#f59e0b',
    'Transportation': '#3b82f6',
    'Shopping': '#ec4899',
    'Entertainment': '#8b5cf6',
    'Utilities': '#f43f5e',
    'Salary': '#10b981',
    'Freelance': '#06b6d4',
    'Other': '#94a3b8'
  };

  // If not authenticated, render Login / Register view
  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-logo-text">Floony</h2>
            <p className="auth-subtitle">
              {authMode === 'login' ? 'Classy AI-Powered Ledger Insights' : 'Create your secure intelligence account'}
            </p>
          </div>

          {authError && (
            <div className="auth-error-box">
              <AlertTriangle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {authMode === 'register' && (
              <div className="form-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="email" 
                    className="form-control" 
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="you@domain.com"
                    required
                    value={authFormData.email}
                    onChange={(e) => setAuthFormData({ ...authFormData, email: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. floony_user"
                  required
                  value={authFormData.username}
                  onChange={(e) => setAuthFormData({ ...authFormData, username: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  placeholder="••••••••"
                  required
                  value={authFormData.password}
                  onChange={(e) => setAuthFormData({ ...authFormData, password: e.target.value })}
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-ai" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }} disabled={isAuthLoading}>
              {isAuthLoading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <Sparkles size={16} />
                  {authMode === 'login' ? 'Access Wallet' : 'Initialize Account'}
                </>
              )}
            </button>
          </form>

          <p className="auth-toggle-text">
            {authMode === 'login' ? "New to Floony?" : "Already have an account?"}
            <span 
              className="auth-toggle-link"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError(null);
              }}
            >
              {authMode === 'login' ? 'Create account' : 'Log in'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <div className="logo-container">
            <span className="logo-text">Floony</span>
            <span className="logo-badge">AI</span>
          </div>

          {/* User Profile Info Card in Sidebar */}
          <div className="user-profile-block">
            <div className="user-avatar">
              {user?.username?.substring(0, 2) || 'FL'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <button className="logout-btn" title="Logout" onClick={handleLogout}>
              <LogOut size={16} />
            </button>
          </div>

          <nav className="nav-list">
            <div 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </div>
            <div 
              className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <ReceiptText size={18} />
              Transactions
            </div>
            <div 
              className={`nav-item ${activeTab === 'ai-coach' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai-coach')}
            >
              <Bot size={18} />
              AI Advisor
            </div>
            <div 
              className={`nav-item ${activeTab === 'budgets' ? 'active' : ''}`}
              onClick={() => setActiveTab('budgets')}
            >
              <Wallet size={18} />
              Budgets
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span className="typing-dot" style={{ backgroundColor: 'var(--success)', opacity: 1, width: 8, height: 8 }}></span>
            <span>Floony Engine: sqlite3</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            <Sparkles size={12} className="insight-icon-purple" style={{ color: 'var(--accent)' }} />
            <span>AI Status: {aiStatus}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="main-content">
        {/* HEADER SECTION */}
        <header className="header-section">
          <div>
            <h1 className="page-title">
              {activeTab === 'dashboard' && 'Financial Snapshot'}
              {activeTab === 'transactions' && 'Ledger Records'}
              {activeTab === 'ai-coach' && 'AI Financial Intelligence'}
              {activeTab === 'budgets' && 'Dynamic Budgets'}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'dashboard' && `Welcome back, ${user?.username}. Here is your AI-analyzed financial health.`}
              {activeTab === 'transactions' && 'View, search, and manage your complete transaction history.'}
              {activeTab === 'ai-coach' && 'Interactive wealth coach fueled by Gemini Generative AI.'}
              {activeTab === 'budgets' && 'Assign money limits to categories to track monthly goals.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Currency Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Currency:</span>
              <select
                className="form-control"
                style={{ width: '100px', padding: '0.4rem 0.5rem', minWidth: 'auto', height: '36px' }}
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  localStorage.setItem('floony_currency', e.target.value);
                }}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            {activeTab === 'ai-coach' && (
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setChatHistory([
                    {
                      role: 'assistant',
                      content: `Hello ${user?.username}! I'm Floony AI, your personal financial advisor. Ask me questions like:\n- *'Am I spending too much on food?'*\n- *'Give me 3 tips to save money'* \n- *'Analyze my spending habits'*.`
                    }
                  ]);
                }}
              >
                Clear Conversation
              </button>
            )}
            <button 
              className="btn"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
            >
              <Plus size={16} />
              Add Transaction
            </button>
          </div>
        </header>

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            {/* FLOONY AI BOX */}
            <div className="ai-box-container">
              <div className="ai-box-header">
                <Sparkles size={14} />
                Natural Language Quick Log
              </div>
              <form onSubmit={handleAiParse} className="ai-input-wrapper">
                <input 
                  type="text" 
                  className="ai-input"
                  placeholder={`Just say: "Spent ${currentCurrencySymbol}250 on lunch at Tokyo Dine today" or "Salary credit ${currentCurrencySymbol}50000"...`}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  disabled={isAiParsing}
                />
                <button type="submit" className="btn btn-ai" disabled={isAiParsing}>
                  {isAiParsing ? (
                    <>
                      <div className="spinner"></div>
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Log with AI
                    </>
                  )}
                </button>
              </form>
              <div className="ai-box-suggestion">
                Suggestions: 
                <span className="ai-box-suggestion-chip" onClick={() => setAiInput(`Coffee at Starbucks for ${currentCurrencySymbol}200 yesterday`)}>Coffee at Starbucks for {currentCurrencySymbol}200 yesterday</span>
                <span className="ai-box-suggestion-chip" onClick={() => setAiInput(`Freelance client paid me ${currentCurrencySymbol}15000`)}>Freelance client paid me {currentCurrencySymbol}15000</span>
              </div>
            </div>

            {/* METRICS GRID */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <span>Net Account Balance</span>
                  <div className="metric-icon-wrapper">
                    <Wallet size={16} style={{ color: 'var(--primary)' }} />
                  </div>
                </div>
                <div className="metric-value" style={{ color: netSavings >= 0 ? 'var(--text-primary)' : 'var(--error)' }}>
                  {currentCurrencySymbol}{netSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`metric-change ${netSavings >= 0 ? 'positive' : 'negative'}`}>
                  {netSavings >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{netSavings >= 0 ? 'Surplus' : 'Deficit'} budget flow</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span>Total Inflow</span>
                  <div className="metric-icon-wrapper">
                    <TrendingUp size={16} style={{ color: 'var(--success)' }} />
                  </div>
                </div>
                <div className="metric-value">
                  {currentCurrencySymbol}{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="metric-change positive">
                  <span>Active earnings tracked</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span>Total Outflow</span>
                  <div className="metric-icon-wrapper">
                    <TrendingDown size={16} style={{ color: 'var(--error)' }} />
                  </div>
                </div>
                <div className="metric-value" style={{ color: 'var(--text-primary)' }}>
                  {currentCurrencySymbol}{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="metric-change neutral">
                  <span>Discretionary & bills combined</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span>Savings Velocity</span>
                  <div className="metric-icon-wrapper">
                    <PiggyBank size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                </div>
                <div className="metric-value">
                  {savingsRate}%
                </div>
                <div className={`metric-change ${savingsRate >= 20 ? 'positive' : 'neutral'}`}>
                  <span>{savingsRate >= 20 ? 'Excellent rate of savings!' : 'Aim for 20% savings margin'}</span>
                </div>
              </div>
            </div>

            {/* CHARTS & RECENT */}
            <div className="dashboard-grid">
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '380px' }}>
                <h3 className="card-title">Daily Expenditure Flow ({currency})</h3>
                <div style={{ flexGrow: 1, width: '100%', height: '240px' }}>
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <Tooltip 
                          formatter={(value) => [`${currentCurrencySymbol}${value}`, 'Spend']}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                          itemStyle={{ color: 'var(--primary)' }}
                        />
                        <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state">
                      <TrendingUp size={24} className="empty-state-icon" />
                      <p>No transactions logged. Charts will appear as you record items.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* BUDGET DYNAMIC PROGRESS */}
              <div className="card">
                <h3 className="card-title">Budget Health</h3>
                <div className="budget-list">
                  {budgets.length > 0 ? (
                    budgets.map(b => {
                      const spent = categorySpendMap[b.category] || 0;
                      const percentage = Math.min(Math.round((spent / b.amount) * 100), 100);
                      const isOver = spent > b.amount;
                      
                      let barColor = 'normal';
                      if (percentage > 90) barColor = 'danger';
                      else if (percentage > 70) barColor = 'warning';

                      return (
                        <div className="budget-item" key={b.category}>
                          <div className="budget-info">
                            <span className="budget-name">{b.category}</span>
                            <span className="budget-limits">
                              {currentCurrencySymbol}{spent.toFixed(0)} <span style={{ color: 'var(--text-muted)' }}>/ {currentCurrencySymbol}{b.amount}</span>
                            </span>
                          </div>
                          <div className="budget-bar-bg">
                            <div 
                              className={`budget-bar-fill ${barColor}`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state" style={{ padding: '1rem' }}>
                      <Wallet size={20} className="empty-state-icon" />
                      <p>No budgets configured. Set limits in the Budgets tab.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RECENT TRANSACTIONS */}
            <div className="card" style={{ marginBottom: '2.5rem' }}>
              <div className="card-title">
                <span>Recent Ledger Records</span>
                <span 
                  style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onClick={() => setActiveTab('transactions')}
                >
                  View full ledger <ChevronRight size={14} />
                </span>
              </div>
              <div className="table-container">
                {transactions.length > 0 ? (
                  <table className="floony-table">
                    <thead>
                      <tr>
                        <th>Details</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 5).map(t => (
                        <tr key={t.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{t.merchant || 'Unknown Merchant'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.description || 'No description'}</div>
                          </td>
                          <td>
                            <span className={`category-badge ${getCategoryBadgeClass(t.category)}`}>
                              {t.category}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.date}</td>
                          <td style={{ textAlign: 'right' }} className={`table-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                            {t.type === 'income' ? '+' : '-'}{currentCurrencySymbol}{t.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <ReceiptText size={32} className="empty-state-icon" />
                    <p>No transactions logged. Use the AI Box above to log one instantly!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. TRANSACTIONS LEDGER VIEW */}
        {activeTab === 'transactions' && (
          <div className="card animate-fade-in" style={{ marginBottom: '2.5rem' }}>
            {/* Filter controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
              <div style={{ flexGrow: 1, minWidth: '200px' }}>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Search merchant or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <select 
                  className="form-control" 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ minWidth: '150px' }}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <select 
                  className="form-control"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ minWidth: '120px' }}
                >
                  <option value="All">All Flows</option>
                  <option value="expense">Expenses Only</option>
                  <option value="income">Income Only</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="table-container">
              {transactions.filter(t => {
                const matchesSearch = 
                  (t.merchant && t.merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
                const matchesType = filterType === 'All' || t.type === filterType;
                return matchesSearch && matchesCategory && matchesType;
              }).length > 0 ? (
                <table className="floony-table">
                  <thead>
                    <tr>
                      <th>Merchant / Payee</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter(t => {
                        const matchesSearch = 
                          (t.merchant && t.merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
                        const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
                        const matchesType = filterType === 'All' || t.type === filterType;
                        return matchesSearch && matchesCategory && matchesType;
                      })
                      .map(t => (
                        <tr key={t.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{t.merchant || 'N/A'}</div>
                          </td>
                          <td>
                            <span className={`category-badge ${getCategoryBadgeClass(t.category)}`}>
                              {t.category}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{t.date}</td>
                          <td style={{ color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.description || '-'}
                          </td>
                          <td style={{ textAlign: 'right' }} className={`table-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                            {t.type === 'income' ? '+' : '-'}{currentCurrencySymbol}{t.amount.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions">
                              <button className="icon-btn" onClick={() => openEditModal(t)}>
                                <Edit2 size={14} />
                              </button>
                              <button className="icon-btn delete" onClick={() => handleDeleteTransaction(t.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <ReceiptText size={32} className="empty-state-icon" />
                  <p>No transactions match your search filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. AI FINANCIAL ADVISOR (COACH) */}
        {activeTab === 'ai-coach' && (
          <div className="ai-assistant-container animate-fade-in">
            {/* Left side Chat Console */}
            <div className="chat-panel">
              <div className="chat-header">
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 700 }}>Floony Smart Advisor</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Powered by Gemini AI</span>
              </div>

              <div className="chat-messages">
                {chatHistory.map((msg, index) => (
                  <div key={index} className={`chat-bubble ${msg.role}`}>
                    <div 
                      style={{ whiteSpace: 'pre-line' }} 
                      dangerouslySetInnerHTML={{ 
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/^- (.*)$/gm, '• $1')
                          // Convert references to $ to the dynamic currency symbol
                          .replace(/\$(\d+(\.\d{1,2})?)/g, `${currentCurrencySymbol}$1`)
                      }}
                    />
                  </div>
                ))}
                {isAiChatting && (
                  <div className="chat-bubble assistant">
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}></div>
              </div>

              <form onSubmit={handleAiChat} className="chat-input-form">
                <input 
                  type="text" 
                  className="chat-input"
                  placeholder="Ask Floony advisor: 'How did I spend on dining out?' or 'Give me saving strategies'..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isAiChatting}
                />
                <button type="submit" className="btn btn-ai" disabled={isAiChatting}>
                  <Send size={14} />
                  Ask AI
                </button>
              </form>
            </div>

            {/* Right side insights sidebar */}
            <div className="insights-panel">
              <div className="insight-card">
                <div className="insight-icon-wrapper insight-icon-purple">
                  <PiggyBank size={16} />
                </div>
                <h4 className="insight-title">Wealth Intelligence</h4>
                <p className="insight-desc">
                  Based on your current logs, your savings rate is <strong>{savingsRate}%</strong>. 
                  {savingsRate > 20 
                    ? ' Performing above the standard recommended mark. Keep investing the excess!'
                    : ' Try to optimize your shopping and food bills to increase this rate above 20%.'}
                </p>
              </div>

              <div className="insight-card">
                <div className="insight-icon-wrapper insight-icon-rose">
                  <AlertTriangle size={16} />
                </div>
                <h4 className="insight-title">Budget Limit Checks</h4>
                <p className="insight-desc">
                  {budgets.some(b => (categorySpendMap[b.category] || 0) > b.amount) ? (
                    <span>
                      You have breached your monthly budget limits in: 
                      <strong style={{ color: 'var(--error)' }}>
                        {budgets
                          .filter(b => (categorySpendMap[b.category] || 0) > b.amount)
                          .map(b => ` ${b.category}`)
                          .join(', ')}
                      </strong>. Limit secondary expenditures.
                    </span>
                  ) : (
                    'Excellent work. All your category spendings are securely inside set budget boundaries. Keep it up!'
                  )}
                </p>
              </div>

              <div className="insight-card">
                <div className="insight-icon-wrapper insight-icon-green">
                  <TrendingUp size={16} />
                </div>
                <h4 className="insight-title">Top Expense Driver</h4>
                <div className="insight-desc" style={{ marginTop: '0.5rem' }}>
                  {categorySpendData.length > 0 ? (
                    <div>
                      Your highest spending category this month is <strong>{categorySpendData[0].name}</strong> with 
                      a total spending of <strong>{currentCurrencySymbol}{categorySpendData[0].value.toFixed(2)}</strong>.
                    </div>
                  ) : (
                    'Add some expenses to find your highest spending categories.'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. BUDGETS MANAGEMENT VIEW */}
        {activeTab === 'budgets' && (
          <div className="card animate-fade-in" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 700 }}>Adjust Monthly Limits</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                  Floony monitors these amounts and will alert you in the AI Advisor console as well as on your dashboard indicators if your monthly spending exceeds your customized threshold.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {CATEGORIES.filter(c => c !== 'Salary' && c !== 'Freelance').map(cat => {
                    const budget = budgets.find(b => b.category === cat);
                    const budgetAmount = budget ? budget.amount : 0;
                    
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cat}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{currentCurrencySymbol}</span>
                          <input 
                            type="number"
                            className="form-control"
                            style={{ width: '120px', padding: '0.4rem 0.75rem' }}
                            value={budgetAmount || ''}
                            onChange={(e) => handleBudgetChange(cat, e.target.value)}
                            placeholder="Set budget"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart analysis of budgets */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 700 }}>Category Breakdown ({currency})</h3>
                <div style={{ flexGrow: 1, width: '100%', height: '300px' }}>
                  {categorySpendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categorySpendData} layout="vertical">
                        <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} width={100} />
                        <Tooltip 
                          formatter={(value) => [`${currentCurrencySymbol}${value}`, 'Spend']}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {categorySpendData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || 'var(--primary)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state">
                      <Wallet size={24} className="empty-state-icon" />
                      <p>No expenses tracked yet. Category breakdown will appear once expenses are added.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI PARSE PREVIEW MODAL */}
      {aiPreview && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                Verify AI Log
              </h3>
              <button className="modal-close" onClick={() => setAiPreview(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="ai-preview-box">
              <div className="ai-preview-title">
                Parsed Transaction
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Amount:</span>
                <span className="ai-preview-val" style={{ color: aiPreview.type === 'income' ? 'var(--success)' : 'inherit' }}>
                  {aiPreview.type === 'income' ? '+' : '-'}{currentCurrencySymbol}{aiPreview.amount?.toFixed(2)}
                </span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Type:</span>
                <span className="ai-preview-val" style={{ textTransform: 'capitalize' }}>{aiPreview.type}</span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Category:</span>
                <span className="ai-preview-val">
                  <span className={`category-badge ${getCategoryBadgeClass(aiPreview.category)}`}>
                    {aiPreview.category}
                  </span>
                </span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Merchant / Payee:</span>
                <span className="ai-preview-val">{aiPreview.merchant || 'N/A'}</span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Date:</span>
                <span className="ai-preview-val">{aiPreview.date}</span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Description:</span>
                <span className="ai-preview-val">{aiPreview.description || 'N/A'}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              Review these parsed parameters carefully. Clicking "Approve & Save" will log this immediately to your secure SQLite ledger database.
            </p>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setAiPreview(null)}>
                Cancel
              </button>
              <button className="btn" onClick={handleApproveAiPreview}>
                <Check size={16} />
                Approve & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRUD TRANSACTION MANUAL MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingTransaction ? 'Edit Ledger Record' : 'Log Transaction'}
              </h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount ({currentCurrencySymbol})</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control"
                    required
                    placeholder="500.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Transaction Flow</label>
                  <select 
                    className="form-control"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="expense">Expense (-)</option>
                    <option value="income">Income (+)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    className="form-control"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <input 
                    type="date" 
                    className="form-control"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Merchant / Payee</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Starbucks, Amazon, Acme Corp"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Description / Note</label>
                <textarea 
                  className="form-control"
                  style={{ height: '70px', resize: 'none' }}
                  placeholder="Additional details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  {editingTransaction ? 'Save Changes' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
