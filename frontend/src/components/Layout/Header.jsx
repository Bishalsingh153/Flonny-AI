import React, { useContext } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FinanceContext } from '../../context/FinanceContext';
import { PeriodSelector } from './PeriodSelector';

export const Header = ({ activeTab, onAddTransactionClick }) => {
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
      case 'dashboard': return `Welcome back, ${user?.username}. Numbers below follow the selected period.`;
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
      <div>
        <h1 className="page-title">{getTitle()}</h1>
        <p className="page-subtitle">{getSubtitle()}</p>
        {showPeriod && <PeriodSelector />}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Display:</span>
          <select
            className="form-control"
            style={{ width: '100px', padding: '0.4rem 0.5rem', minWidth: 'auto', height: '36px' }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
          </select>
        </div>

        {activeTab === 'ai-coach' && (
          <button className="btn btn-secondary" onClick={clearChat}>Clear Conversation</button>
        )}
        <button className="btn" onClick={onAddTransactionClick}>
          <Plus size={16} />
          Add Transaction
        </button>
      </div>
    </header>
  );
};
