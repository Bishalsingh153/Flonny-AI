import React, { useContext, useState } from 'react';
import { LogOut, LayoutDashboard, ReceiptText, Bot, Wallet, Sparkles, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FinanceContext } from '../../context/FinanceContext';

export const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const { user, handleLogout } = useAuth();
  const { aiStatus } = useContext(FinanceContext);


  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsOpen(false); // auto-close on mobile after selecting a tab
  };

  return (
    <>
      {/* Hamburger trigger — visible on mobile via CSS */}
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop — closes sidebar when tapped */}
      {isOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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
              onClick={() => handleNavClick('dashboard')}
            >
              <LayoutDashboard size={18} />
              Dashboarddd
            </div>
            <div
              className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => handleNavClick('transactions')}
            >
              <ReceiptText size={18} />
              Transactions
            </div>
            <div
              className={`nav-item ${activeTab === 'ai-coach' ? 'active' : ''}`}
              onClick={() => handleNavClick('ai-coach')}
            >
              <Bot size={18} />
              AI Advisor
            </div>
            <div
              className={`nav-item ${activeTab === 'budgets' ? 'active' : ''}`}
              onClick={() => handleNavClick('budgets')}
            >
              <Wallet size={18} />
              Budgets
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            <Sparkles size={12} className="insight-icon-purple" style={{ color: 'var(--accent)' }} />
            <span>AI Status: {aiStatus}</span>
          </div>
        </div>
      </aside>
    </>
  );
};