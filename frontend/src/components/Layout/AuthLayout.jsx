import React from 'react';
import { AlertTriangle, Mail, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AuthLayout = () => {
  const {
    authMode,
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

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-logo-text">Floony</h2>
          <p className="auth-subtitle">
            {authMode === 'login' ? 'Classy AI-Powered Ledger Insights' : 'Create your secure intelligence account'}
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

          <button type="submit" className="btn btn-ai" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }} disabled={isAuthLoading}>
            {isAuthLoading ? (
              <div className="spinner"></div>
            ) : (
              <>
                {authMode === 'login' ? 'Access Wallet' : 'Initialize Account'}
              </>
            )}
          </button>
        </form>

        <p className="auth-toggle-text">
          {authMode === 'login' ? "New to Floony?" : "Already have an account?"}
          <span 
            className="auth-toggle-link"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setAuthError(null);
            }}
          >
            {authMode === 'login' ? 'Create account' : 'Log in'}
          </span>
        </p>
      </div>
    </div>
  );
};
