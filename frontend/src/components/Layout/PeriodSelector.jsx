import React, { useContext } from 'react';
import { FinanceContext } from '../../context/FinanceContext';

export const PeriodSelector = () => {
  const {
    periodPreset,
    setPeriodPreset,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd
  } = useContext(FinanceContext);

  return (
    <div className="period-selector">
      {['this_month', 'last_month', 'custom'].map((key) => (
        <button
          key={key}
          type="button"
          className={`period-chip ${periodPreset === key ? 'active' : ''}`}
          onClick={() => setPeriodPreset(key)}
        >
          {key === 'this_month' ? 'This month' : key === 'last_month' ? 'Last month' : 'Custom'}
        </button>
      ))}
      {periodPreset === 'custom' && (
        <>
          <input type="date" className="form-control period-date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          <input type="date" className="form-control period-date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
        </>
      )}
    </div>
  );
};
