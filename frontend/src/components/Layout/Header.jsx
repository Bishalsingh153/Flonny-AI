import React, { useContext } from 'react';
import { Plus, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FinanceContext } from '../../context/FinanceContext';
import { PeriodSelector } from './PeriodSelector';

export const Header = ({ activeTab, onAddTransactionClick, sidebarOpen, onToggleSidebar }) => {
  const { user } = useAuth();
  const { currency, setCurrency, clearChat } = useContext(FinanceContext);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Financial Snapshot';
      case 'transactions': return 'Ledger Records';
      case 'ai-coach': return 'AI Financial Intelligence';
      case 'budgets': return 'Dynamic Budgets';
      case 'goals': return 'Savings Goals';
      case 'recurring': return 'Bills & Subscriptions';
      case 'wrap': return 'Monthly Wrap';
      default: return 'Floony AI';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return `Welcome back, ${user?.username}. Numbers follow the selected period.`;
      case 'transactions': return 'Search, filter, import bank CSVs, and export your ledger.';
      case 'ai-coach': return 'Text chat with Floony. Ledger numbers, TARS energy.';
      case 'budgets': return 'Monthly limits compared against the selected period.';
      case 'goals': return 'Named pots with targets and deadlines.';
      case 'recurring': return 'Confirm detected bills, then log this month in one tap.';
      case 'wrap': return 'A generated recap of the month.';
      default: return '';
    }
  };

  const showPeriod = ['dashboard', 'budgets', 'ai-coach'].includes(activeTab);

  return (
    <header className="header-section">
      <div className="header-copy">
        <div className="header-title-row">
          {!sidebarOpen && (
            <button
              type="button"
              className="sidebar-toggle in-header"
              onClick={onToggleSidebar}
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>
          )}
          <h1 className="page-title">{getTitle()}</h1>
        </div>
        <p className="page-subtitle">{getSubtitle()}</p>
        {showPeriod && <PeriodSelector />}
      </div>

      <div className="header-actions">
        <label className="display-field">
          <span>Display</span>
          <select
            className="form-control"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
          </select>
        </label>

        {activeTab === 'ai-coach' && (
          <button className="btn btn-secondary" onClick={clearChat}>Clear</button>
        )}
        <button className="btn" onClick={onAddTransactionClick}>
          <Plus size={16} />
          Add Transaction
        </button>
      </div>
    </header>
  );
};
