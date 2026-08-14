import React, { useContext } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { formatDisplay } from '../../utils/displayAmount';
import { CURRENCIES } from '../../constants/currencies';

export const RecurringPanel = () => {
  const {
    recurring,
    recurringSuggestions,
    addRecurring,
    deleteRecurring,
    logRecurring,
    currency,
    fxRates
  } = useContext(FinanceContext);
  const symbol = CURRENCIES[currency] || '₹';

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <div className="card">
        <h3 className="card-title">Detected subscriptions</h3>
        {recurringSuggestions.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Need two or more monthly-ish payments to the same merchant.</p>
        )}
        {recurringSuggestions.map((s) => (
          <div key={s.merchant} className="goal-row">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{s.merchant}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.category} · {s.occurrences} times · next {s.next_date}</div>
              </div>
              <span>{formatDisplay(s.amount, symbol, 'INR', fxRates)}</span>
            </div>
            <button className="btn" type="button" style={{ marginTop: '0.6rem' }} onClick={() => addRecurring(s)}>Confirm recurrence</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="card-title">Active rules</h3>
        {recurring.map((r) => (
          <div key={r.id} className="goal-row">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{r.merchant}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.cadence} · next {r.next_date}</div>
              </div>
              <span>{formatDisplay(r.amount, symbol, 'INR', fxRates)}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
              <button className="btn" type="button" onClick={() => logRecurring(r.id)}>Log this month</button>
              <button className="btn btn-secondary" type="button" onClick={() => deleteRecurring(r.id)}>Remove</button>
            </div>
          </div>
        ))}
        {recurring.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No confirmed recurrences yet.</p>}
      </div>
    </div>
  );
};
