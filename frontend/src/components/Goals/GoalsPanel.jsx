import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { formatDisplay } from '../../utils/displayAmount';
import { CURRENCIES } from '../../constants/currencies';

export const GoalsPanel = () => {
  const { goals, addGoal, updateGoal, deleteGoal, currency, fxRates } = useContext(FinanceContext);
  const symbol = CURRENCIES[currency] || '₹';
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '', deadline: '' });

  const submit = async (e) => {
    e.preventDefault();
    await addGoal({
      name: form.name,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount || '0'),
      deadline: form.deadline || null
    });
    setForm({ name: '', target_amount: '', current_amount: '', deadline: '' });
  };

  return (
    <div className="card animate-fade-in" style={{ marginBottom: '2.5rem' }}>
      <form onSubmit={submit} className="form-row" style={{ marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div className="form-group">
          <label>Goal name</label>
          <input className="form-control" required placeholder="Emergency / Goa trip" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Target ({symbol})</label>
          <input className="form-control" type="number" required value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Saved so far</label>
          <input className="form-control" type="number" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Deadline</label>
          <input className="form-control" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </div>
        <button className="btn" type="submit">Add goal</button>
      </form>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {goals.map((g) => {
          const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
          return (
            <div key={g.id} className="goal-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <strong>{g.name}</strong>
                <span>{formatDisplay(g.current_amount, symbol, currency, fxRates)} / {formatDisplay(g.target_amount, symbol, currency, fxRates)}</span>
              </div>
              {g.deadline && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>By {g.deadline}</div>}
              <div className="budget-bar-bg">
                <div className="budget-bar-fill normal" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <button className="btn btn-secondary" type="button" onClick={() => updateGoal(g.id, { current_amount: Number(g.current_amount) + 1000 })}>+{symbol}1000</button>
                <button className="btn btn-secondary" type="button" onClick={() => deleteGoal(g.id)}>Remove</button>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No goals yet. Create an emergency fund or a trip pot.</p>}
      </div>
    </div>
  );
};
