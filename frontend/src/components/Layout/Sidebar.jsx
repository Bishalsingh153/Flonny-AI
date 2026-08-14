import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, ReceiptText, Bot, Wallet, Sparkles, PanelLeftClose, Target, Repeat, CalendarDays } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FinanceContext } from '../../context/FinanceContext';
import { pathFromTab } from '../../utils/routes';

export const Sidebar = ({ activeTab, isOpen, setIsOpen }) => {
  const { user, handleLogout } = useAuth();
  const { aiStatus } = useContext(FinanceContext);
  const navigate = useNavigate();

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
      {isOpen && <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div>
          <div className="logo-container">
            <span className="logo-text">Floony</span>
            <span className="landing-rule" aria-hidden="true" />
            <span className="logo-badge">AI</span>
            <button
              type="button"
              className="sidebar-collapse"
              title="Collapse sidebar"
              onClick={() => setIsOpen(false)}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          <div className="user-profile-block">
            <div className="user-avatar">{user?.username?.substring(0, 2) || 'FL'}</div>
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <button
              className="logout-btn"
              title="Logout"
              onClick={() => {
                handleLogout();
                navigate('/');
              }}
            >
              <LogOut size={16} />
            </button>
          </div>

          <nav className="nav-list">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={pathFromTab(item.id)}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => {
                    if (window.innerWidth <= 768) setIsOpen(false);
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <Sparkles size={12} />
            <span>{aiStatus}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
