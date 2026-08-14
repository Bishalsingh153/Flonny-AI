import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { formatDisplay } from '../../utils/displayAmount';
import { CURRENCIES } from '../../constants/currencies';
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const MonthlyWrap = () => {
  const { wrap, loadWrap, currency, fxRates } = useContext(FinanceContext);
  const [month, setMonth] = useState(currentMonthKey());
  const symbol = CURRENCIES[currency] || '₹';

  if (!wrap) {
    return <div className="card">Loading wrap…</div>;
  }

  return (
    <div className="card animate-fade-in wrap-card" style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ margin: 0 }}>Your {wrap.month} money wrap</h3>
        <input
          type="month"
          className="form-control"
          style={{ width: '180px' }}
          value={month}
          onChange={async (e) => {
            setMonth(e.target.value);
            await loadWrap(e.target.value);
          }}
        />
      </div>
      <p className="wrap-narrative">{wrap.narrative}</p>
      <div className="metrics-grid" style={{ marginTop: '1.5rem' }}>
        <div className="wrap-stat">
          <span>Income</span>
          <strong>{formatDisplay(wrap.income, symbol, currency, fxRates)}</strong>
        </div>
        <div className="wrap-stat">
          <span>Spend</span>
          <strong>{formatDisplay(wrap.expense, symbol, currency, fxRates)}</strong>
        </div>
        <div className="wrap-stat">
          <span>Savings rate</span>
          <strong>{wrap.savingsRate}%</strong>
        </div>
        <div className="wrap-stat">
          <span>Entries</span>
          <strong>{wrap.transactionCount}</strong>
        </div>
      </div>
      <p style={{ marginTop: '1.25rem', color: 'var(--text-secondary)' }}>
        Top category: <strong>{wrap.topCategory || '—'}</strong>
        {' · '}
        Top merchant: <strong>{wrap.topMerchant || '—'}</strong>
      </p>
    </div>
  );
};
