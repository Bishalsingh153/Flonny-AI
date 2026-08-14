import React, { useContext } from 'react';
import { LogOut, LayoutDashboard, ReceiptText, Bot, Wallet, Sparkles, Menu, X, Target, Repeat, CalendarDays } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FinanceContext } from '../../context/FinanceContext';

export const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const { user, handleLogout } = useAuth();
  const { aiStatus } = useContext(FinanceContext);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'ai-coach', label: 'AI Advisor', icon: Bot },
    { id: 'budgets', label: 'Budgets', icon: Wallet },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'recurring', label: 'Recurring', icon: Repeat },
    { id: 'wrap', label: 'Monthly Wrap', icon: CalendarDays }
  ];

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div>
          <div className="logo-container">
            <span className="logo-text">Floony</span>
            <span className="logo-badge">AI</span>
          </div>

          <div className="user-profile-block">
            <div className="user-avatar">{user?.username?.substring(0, 2) || 'FL'}</div>
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <button className="logout-btn" title="Logout" onClick={handleLogout}>
              <LogOut size={16} />
            </button>
          </div>

          <nav className="nav-list">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon size={18} />
                  {item.label}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            <Sparkles size={12} style={{ color: 'var(--accent)' }} />
            <span>AI Status: {aiStatus}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
