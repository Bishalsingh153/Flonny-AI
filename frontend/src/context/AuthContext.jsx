import React, { createContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { API_BASE } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('floony_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('floony_user')) || null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authFormData, setAuthFormData] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('floony_token');
    localStorage.removeItem('floony_user');
    setToken(null);
    setUser(null);
  };

  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error('Unauthorized or expired session');
    }
    return res;
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#8b5cf6', '#10b981']
    });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    const url = authMode === 'login' 
      ? `${API_BASE}/auth/login` 
      : `${API_BASE}/auth/register`;

    const body = authMode === 'login'
      ? { username: authFormData.username, password: authFormData.password }
      : authFormData;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('floony_token', data.token);
      localStorage.setItem('floony_user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      setAuthFormData({ username: '', email: '', password: '' });
      triggerCelebration();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      authMode,
      setAuthMode,
      authFormData,
      setAuthFormData,
      authError,
      setAuthError,
      isAuthLoading,
      showPassword,
      setShowPassword,
      handleAuthSubmit,
      handleLogout,
      authFetch
    }}>
      {children}
    </AuthContext.Provider>
  );
};
