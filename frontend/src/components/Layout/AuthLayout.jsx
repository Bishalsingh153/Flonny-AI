import React, { useEffect } from 'react';
import { AlertTriangle, Mail, User, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LandingPage } from './LandingPage';

export const AuthLayout = () => {
  const {
    setAuthMode,
    authFormData,
    setAuthFormData,
    authError,
    setAuthError,
    isAuthLoading,
    showPassword,
    setShowPassword,
    handleAuthSubmit
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const authMode = location.pathname === '/signup' ? 'register' : 'login';

  useEffect(() => {
    if (location.pathname === '/signup') setAuthMode('register');
    if (location.pathname === '/login') setAuthMode('login');
  }, [location.pathname, setAuthMode]);

  if (location.pathname === '/') return <LandingPage />;

  return (
    <div className="brand-stage auth-stage">
      <div className="brand-wash" aria-hidden="true" />
      <div className="brand-grain" aria-hidden="true" />

      <div className="auth-card">
        <button
          type="button"
          className="auth-back"
          onClick={() => {
            setAuthError(null);
            navigate('/');
          }}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="auth-header">
          <h2 className="auth-logo-text">Floony</h2>
          <p className="auth-subtitle">
            {authMode === 'login' ? 'Log in to your ledger' : 'Create your Floony account'}
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

          <button type="submit" className="btn-solid auth-submit" disabled={isAuthLoading}>
            {isAuthLoading ? <div className="spinner"></div> : (authMode === 'login' ? 'Login' : 'Sign up')}
          </button>
        </form>

        <p className="auth-toggle-text">
          {authMode === 'login' ? 'New to Floony?' : 'Already have an account?'}
          <span
            className="auth-toggle-link"
            onClick={() => {
              setAuthError(null);
              navigate(authMode === 'login' ? '/signup' : '/login');
            }}
          >
            {authMode === 'login' ? 'Sign up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
};
