import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const LandingPage = () => {
  const { token, setAuthError } = useAuth();
  const navigate = useNavigate();

  const openAuth = (mode) => {
    setAuthError(null);
    if (token) {
      navigate('/dashboard');
      return;
    }
    navigate(mode === 'login' ? '/login' : '/signup');
  };

  return (
    <div className="brand-stage">
      <div className="brand-wash" aria-hidden="true" />
      <div className="brand-grain" aria-hidden="true" />

      <header className="landing-nav">
        <div className="landing-mark">
          <span className="landing-wordmark">Floony</span>
          <span className="landing-rule" aria-hidden="true" />
          <span className="landing-kicker">AI financial intelligence</span>
        </div>
        <div className="landing-nav-actions">
          {token ? (
            <button type="button" className="btn-solid" onClick={() => navigate('/dashboard')}>
              Open ledger
            </button>
          ) : (
            <>
              <button type="button" className="btn-ghost" onClick={() => openAuth('login')}>
                Login
              </button>
              <button type="button" className="btn-solid" onClick={() => openAuth('register')}>
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      <main className="landing-hero">
        <p className="landing-eyebrow">Personal ledger · India first</p>
        <h1 className="landing-title">
          Talk to your money.
          <br />
          Trust the numbers.
        </h1>
        <p className="landing-lede">
          Floony is an AI expense tracker that logs what you type, keeps the ledger honest,
          and coaches you without the bank-app noise.
        </p>
        <div className="landing-hero-actions">
          {token ? (
            <button type="button" className="btn-solid" onClick={() => navigate('/dashboard')}>
              Open ledger
            </button>
          ) : (
            <>
              <button type="button" className="btn-solid" onClick={() => openAuth('register')}>
                Sign up
              </button>
              <button type="button" className="btn-ghost" onClick={() => openAuth('login')}>
                Login
              </button>
            </>
          )}
        </div>
      </main>

      <section className="landing-points">
        <article>
          <h2>Log in plain language</h2>
          <p>Spent two hundred on lunch at a cafe. Floony parses it. You confirm.</p>
        </article>
        <article>
          <h2>Numbers from the ledger</h2>
          <p>Spend, budgets, and savings come from your books — not a guess.</p>
        </article>
        <article>
          <h2>Coach, not a chatbot</h2>
          <p>Ask about this month. Set a cap. Catch a recurring bill. Dry, short, useful.</p>
        </article>
      </section>
    </div>
  );
};
