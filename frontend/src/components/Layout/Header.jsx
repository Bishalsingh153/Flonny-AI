import React, { useContext } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FinanceContext } from '../../context/FinanceContext';

export const Header = ({ activeTab, onAddTransactionClick }) => {
  const { user } = useAuth();
  const { currency, setCurrency, setChatHistory } = useContext(FinanceContext);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Financial Snapshot';
      case 'transactions': return 'Ledger Records';
      case 'ai-coach': return 'AI Financial Intelligence';
      case 'budgets': return 'Dynamic Budgets';
      default: return 'Floony AI';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return `Welcome back, ${user?.username}. Here is your AI-analyzed financial health.`;
      case 'transactions': return 'View, search, and manage your complete transaction history.';
      case 'ai-coach': return 'Interactive wealth coach fueled by Gemini Generative AI.';
      case 'budgets': return 'Assign money limits to categories to track monthly goals.';
      default: return '';
    }
  };

  return (
    <header className="header-section">
      <div>
        <h1 className="page-title">{getTitle()}</h1>
        <p className="page-subtitle">{getSubtitle()}</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Currency:</span>
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
        <button className="btn" onClick={onAddTransactionClick}>
          <Plus size={16} />
          Add Transaction
        </button>
      </div>
    </header>
  );
};
