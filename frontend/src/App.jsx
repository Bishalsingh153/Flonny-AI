import React, { useState, useContext } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { FinanceProvider, FinanceContext } from './context/FinanceContext';
import { useAuth } from './hooks/useAuth';

import { CATEGORIES } from './constants/categories';
import { CURRENCIES } from './constants/currencies';
import { COLORS } from './constants/colors';

import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { AuthLayout } from './components/Layout/AuthLayout';

import { MetricCard } from './components/Dashboard/MetricCard';
import { BudgetHealth } from './components/Dashboard/BudgetHealth';
import { SpendingChart } from './components/Dashboard/SpendingChart';
import { RecentTransactions } from './components/Dashboard/RecentTransactions';

import { FilterBar } from './components/Transactions/FilterBar';
import { TransactionTable } from './components/Transactions/TransactionTable';
import { TransactionModal } from './components/Transactions/TransactionModal';

import { ChatPanel } from './components/AI/ChatPanel';
import { InsightCard } from './components/AI/InsightCard';
import { AiParseBox } from './components/AI/AiParseBox';

function AppContent() {
  const { token } = useAuth();
  const {
    currency,
    transactions,
    budgets,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    handleBudgetChange
  } = useContext(FinanceContext);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Filter States (Transactions page)
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (!token) {
    return <AuthLayout />;
  }

  const currentCurrencySymbol = CURRENCIES[currency] || '₹';

  // Calculations for dashboard metrics
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

  const categorySpendData = Object.entries(categorySpendMap)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }))
    .sort((a, b) => b.value - a.value);

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

  const handleFormSubmit = async (dataToSend) => {
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, dataToSend);
      } else {
        await addTransaction(dataToSend);
      }
      setIsModalOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* MAIN CONTAINER */}
      <main className="main-content">
        {/* HEADER SECTION */}
        <Header 
          activeTab={activeTab} 
          onAddTransactionClick={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }} 
        />

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            {/* FLOONY AI BOX */}
            <AiParseBox />

            {/* METRICS GRID */}
            <div className="metrics-grid">
              <MetricCard 
                title="Net Account Balance"
                value={`${currentCurrencySymbol}${netSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                change={`${netSavings >= 0 ? 'Surplus' : 'Deficit'} budget flow`}
                changeType={netSavings >= 0 ? 'positive' : 'negative'}
                icon={Wallet}
                changeIcon={netSavings >= 0 ? TrendingUp : TrendingDown}
              />
              <MetricCard 
                title="Total Inflow"
                value={`${currentCurrencySymbol}${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                change="Active earnings tracked"
                changeType="positive"
                icon={TrendingUp}
              />
              <MetricCard 
                title="Total Outflow"
                value={`${currentCurrencySymbol}${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                change="Discretionary & bills combined"
                changeType="neutral"
                icon={TrendingDown}
              />
              <MetricCard 
                title="Savings Velocity"
                value={`${savingsRate}%`}
                change={savingsRate >= 20 ? 'Excellent rate of savings!' : 'Aim for 20% savings margin'}
                changeType={savingsRate >= 20 ? 'positive' : 'neutral'}
                icon={PiggyBank}
              />
            </div>

            {/* CHARTS & BUDGET */}
            <div className="dashboard-grid">
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '380px' }}>
                <h3 className="card-title">Daily Expenditure Flow ({currency})</h3>
                <div style={{ flexGrow: 1, width: '100%', height: '240px' }}>
                  <SpendingChart trendData={trendData} currencySymbol={currentCurrencySymbol} />
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">Budget Health</h3>
                <BudgetHealth 
                  budgets={budgets} 
                  categorySpendMap={categorySpendMap} 
                  currencySymbol={currentCurrencySymbol} 
                />
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
                <RecentTransactions 
                  transactions={transactions} 
                  currencySymbol={currentCurrencySymbol} 
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. TRANSACTIONS LEDGER VIEW */}
        {activeTab === 'transactions' && (
          <div className="card animate-fade-in" style={{ marginBottom: '2.5rem' }}>
            <FilterBar 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              filterType={filterType}
              setFilterType={setFilterType}
            />

            <div className="table-container">
              <TransactionTable 
                transactions={transactions.filter(t => {
                  const matchesSearch = 
                    (t.merchant && t.merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
                  const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
                  const matchesType = filterType === 'All' || t.type === filterType;
                  return matchesSearch && matchesCategory && matchesType;
                })}
                currencySymbol={currentCurrencySymbol}
                onEdit={(t) => {
                  setEditingTransaction(t);
                  setIsModalOpen(true);
                }}
                onDelete={(id) => {
                  if (window.confirm('Are you sure you want to delete this transaction?')) {
                    deleteTransaction(id);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* 3. AI FINANCIAL ADVISOR (COACH) */}
        {activeTab === 'ai-coach' && (
          <div className="ai-assistant-container animate-fade-in">
            <ChatPanel />

            <div className="insights-panel">
              <InsightCard 
                title="Wealth Intelligence"
                icon={PiggyBank}
                iconClass="insight-icon-purple"
                description={
                  <>
                    Based on your current logs, your savings rate is <strong>{savingsRate}%</strong>. 
                    {savingsRate > 20 
                      ? ' Performing above the standard recommended mark. Keep investing the excess!'
                      : ' Try to optimize your shopping and food bills to increase this rate above 20%.'}
                  </>
                }
              />

              <InsightCard 
                title="Budget Limit Checks"
                icon={AlertTriangle}
                iconClass="insight-icon-rose"
                description={
                  budgets.some(b => (categorySpendMap[b.category] || 0) > b.amount) ? (
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
                  )
                }
              />

              <InsightCard 
                title="Top Expense Driver"
                icon={TrendingUp}
                iconClass="insight-icon-green"
                description={
                  categorySpendData.length > 0 ? (
                    <div>
                      Your highest spending category this month is <strong>{categorySpendData[0].name}</strong> with 
                      a total spending of <strong>{currentCurrencySymbol}{categorySpendData[0].value.toFixed(2)}</strong>.
                    </div>
                  ) : (
                    'Add some expenses to find your highest spending categories.'
                  )
                }
              />
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

      {/* CRUD TRANSACTION MANUAL MODAL */}
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleFormSubmit}
        editingTransaction={editingTransaction}
        currencySymbol={currentCurrencySymbol}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <AppContent />
      </FinanceProvider>
    </AuthProvider>
  );
}

export default App;
