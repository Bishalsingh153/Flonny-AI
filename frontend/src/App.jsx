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

import { AuthProvider } from './context/AuthContext';
import { FinanceProvider, FinanceContext } from './context/FinanceContext';
import { useAuth } from './hooks/useAuth';

import { EXPENSE_CATEGORIES } from './constants/categories';
import { CURRENCIES } from './constants/currencies';
import { COLORS } from './constants/colors';
import { toDisplay, formatDisplay } from './utils/displayAmount';
import { monthLabel } from './utils/period';

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
import { ImportModal } from './components/Transactions/ImportModal';

import { ChatPanel } from './components/AI/ChatPanel';
import { InsightCard } from './components/AI/InsightCard';
import { AiParseBox } from './components/AI/AiParseBox';
import { GoalsPanel } from './components/Goals/GoalsPanel';
import { RecurringPanel } from './components/Recurring/RecurringPanel';
import { MonthlyWrap } from './components/Wrap/MonthlyWrap';

function AppContent() {
  const { token } = useAuth();
  const {
    currency,
    fxRates,
    periodTransactions,
    periodPreset,
    periodRange,
    transactions,
    budgets,
    insights,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    handleBudgetChange,
    exportCsv
  } = useContext(FinanceContext);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  if (!token) return <AuthLayout />;

  const currentCurrencySymbol = CURRENCIES[currency] || '₹';
  const scoped = periodTransactions;

  const totalIncome = scoped.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = scoped.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  const categorySpendMap = {};
  scoped.filter((t) => t.type === 'expense').forEach((t) => {
    categorySpendMap[t.category] = (categorySpendMap[t.category] || 0) + t.amount;
  });

  const categorySpendData = Object.entries(categorySpendMap)
    .map(([name, value]) => ({
      name,
      value: parseFloat(toDisplay(value, currency, fxRates).toFixed(2))
    }))
    .sort((a, b) => b.value - a.value);

  const dateSpendMap = {};
  scoped.filter((t) => t.type === 'expense').forEach((t) => {
    dateSpendMap[t.date] = (dateSpendMap[t.date] || 0) + t.amount;
  });

  const trendData = Object.entries(dateSpendMap)
    .map(([date, amount]) => ({
      date: date.substring(5),
      amount: parseFloat(toDisplay(amount, currency, fxRates).toFixed(2)),
      rawDate: date
    }))
    .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
    .slice(-10);

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

  const filteredLedger = transactions
    .filter((t) => {
      const matchesSearch =
        (t.merchant && t.merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
      const matchesType = filterType === 'All' || t.type === filterType;
      const matchesFrom = !dateFrom || t.date >= dateFrom;
      const matchesTo = !dateTo || t.date <= dateTo;
      return matchesSearch && matchesCategory && matchesType && matchesFrom && matchesTo;
    })
    .sort((a, b) => (sortDir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

  const insightCards = insights?.cards || [];

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="main-content">
        <Header
          activeTab={activeTab}
          onAddTransactionClick={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
        />

        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <AiParseBox />

            <div className="metrics-grid">
              <MetricCard
                title="Net for period"
                value={formatDisplay(netSavings, currentCurrencySymbol, currency, fxRates)}
                change={monthLabel(periodPreset, periodRange)}
                changeType={netSavings >= 0 ? 'positive' : 'negative'}
                icon={Wallet}
                changeIcon={netSavings >= 0 ? TrendingUp : TrendingDown}
              />
              <MetricCard
                title="Income"
                value={formatDisplay(totalIncome, currentCurrencySymbol, currency, fxRates)}
                change="Inflows in selected period"
                changeType="positive"
                icon={TrendingUp}
              />
              <MetricCard
                title="Spend"
                value={formatDisplay(totalExpense, currentCurrencySymbol, currency, fxRates)}
                change="Outflows in selected period"
                changeType="neutral"
                icon={TrendingDown}
              />
              <MetricCard
                title="Savings rate"
                value={`${savingsRate}%`}
                change={savingsRate >= 20 ? 'Above the 20% mark' : 'Aim for 20% of income'}
                changeType={savingsRate >= 20 ? 'positive' : 'neutral'}
                icon={PiggyBank}
              />
            </div>

            {insights?.narrative && (
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <h3 className="card-title">Today&apos;s coaching note</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{insights.narrative}</p>
              </div>
            )}

            <div className="dashboard-grid">
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '380px' }}>
                <h3 className="card-title">Daily expenditure ({currency})</h3>
                <div style={{ flexGrow: 1, width: '100%', height: '240px' }}>
                  <SpendingChart trendData={trendData} currencySymbol={currentCurrencySymbol} />
                </div>
              </div>
              <div className="card">
                <h3 className="card-title">Budget health</h3>
                <BudgetHealth
                  budgets={budgets}
                  categorySpendMap={categorySpendMap}
                  currencySymbol={currentCurrencySymbol}
                  currency={currency}
                  fxRates={fxRates}
                />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '2.5rem' }}>
              <div className="card-title">
                <span>Recent in this period</span>
                <span
                  style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onClick={() => setActiveTab('transactions')}
                >
                  View full ledger <ChevronRight size={14} />
                </span>
              </div>
              <div className="table-container">
                <RecentTransactions
                  transactions={scoped}
                  currencySymbol={currentCurrencySymbol}
                  currency={currency}
                  fxRates={fxRates}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="card animate-fade-in" style={{ marginBottom: '2.5rem' }}>
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              filterType={filterType}
              setFilterType={setFilterType}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              sortDir={sortDir}
              setSortDir={setSortDir}
              onImport={() => setImportOpen(true)}
              onExport={exportCsv}
            />
            <div className="table-container">
              <TransactionTable
                transactions={filteredLedger}
                onEdit={(t) => {
                  setEditingTransaction(t);
                  setIsModalOpen(true);
                }}
                onDelete={(id) => {
                  if (window.confirm('Delete this transaction?')) deleteTransaction(id);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'ai-coach' && (
          <div className="ai-assistant-container animate-fade-in">
            <ChatPanel />
            <div className="insights-panel">
              {(insightCards.length ? insightCards : [
                { key: 'savings', title: 'Wealth intelligence', body: `Savings rate this period is ${savingsRate}%.` },
                { key: 'burn', title: 'Budget checks', body: 'Set budgets to see burn-rate warnings.' },
                { key: 'merchant', title: 'Top expense', body: categorySpendData[0] ? `${categorySpendData[0].name} is leading spend.` : 'Add expenses to rank categories.' }
              ]).map((card) => (
                <InsightCard
                  key={card.key || card.title}
                  title={card.title}
                  icon={card.key === 'burn' ? AlertTriangle : card.key === 'savings' ? PiggyBank : TrendingUp}
                  iconClass={card.key === 'burn' ? 'insight-icon-rose' : card.key === 'savings' ? 'insight-icon-purple' : 'insight-icon-green'}
                  description={card.body}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="card animate-fade-in" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 700 }}>Monthly limits</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                  Limits are monthly. Progress bars use spend from the selected period ({monthLabel(periodPreset, periodRange)}).
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const budget = budgets.find((b) => b.category === cat);
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
                            value={budgetAmount ? Math.round(toDisplay(budgetAmount, currency, fxRates)) : ''}
                            onChange={(e) => {
                              const display = parseFloat(e.target.value);
                              if (Number.isNaN(display)) {
                                handleBudgetChange(cat, 0);
                                return;
                              }
                              const inr = currency === 'INR' || !fxRates[currency] ? display : display / fxRates[currency];
                              handleBudgetChange(cat, inr);
                            }}
                            placeholder="Set budget"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 700 }}>Category breakdown ({currency})</h3>
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
                      <p>No expenses in this period.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goals' && <GoalsPanel />}
        {activeTab === 'recurring' && <RecurringPanel />}
        {activeTab === 'wrap' && <MonthlyWrap />}
      </main>

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
      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
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
