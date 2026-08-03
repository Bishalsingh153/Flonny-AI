import React, { useContext } from 'react';
import { LogOut, LayoutDashboard, ReceiptText, Bot, Wallet, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FinanceContext } from '../../context/FinanceContext';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, handleLogout } = useAuth();
  const { aiStatus } = useContext(FinanceContext);

  return (
    <aside className="sidebar">
      <div>
        <div className="logo-container">
          <span className="logo-text">Floony</span>
          <span className="logo-badge">AI</span>
        </div>

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
  );
};
