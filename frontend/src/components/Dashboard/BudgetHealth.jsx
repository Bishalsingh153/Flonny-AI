import React from 'react';
import { Wallet } from 'lucide-react';
import { EmptyState } from '../UI/EmptyState';
import { formatDisplay } from '../../utils/displayAmount';
import { ForecastHint } from './ForecastHint';

export const BudgetHealth = ({ budgets, categorySpendMap, forecasts, currencySymbol, currency, fxRates }) => {
  if (budgets.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        message="No budgets configured. Set limits in the Budgets tab."
        style={{ padding: '1rem' }}
      />
    );
  }

  return (
    <div className="budget-list">
      {budgets.map((b) => {
        const spent = categorySpendMap[b.category] || 0;
        const percentage = b.amount > 0 ? Math.min(Math.round((spent / b.amount) * 100), 100) : 0;
        let barColor = 'normal';
        if (percentage > 90) barColor = 'danger';
        else if (percentage > 70) barColor = 'warning';

        return (
          <div className="budget-item" key={b.category}>
            <div className="budget-info">
              <span className="budget-name">{b.category}</span>
              <span className="budget-limits">
                {formatDisplay(spent, currencySymbol, currency, fxRates)}
                <span style={{ color: 'var(--text-muted)' }}> / {formatDisplay(b.amount, currencySymbol, currency, fxRates)}</span>
              </span>
            </div>
            <div className="budget-bar-bg">
              <div className={`budget-bar-fill ${barColor}`} style={{ width: `${percentage}%` }}></div>
            </div>
            <ForecastHint
              forecast={forecasts?.[b.category]}
              currencySymbol={currencySymbol}
              currency={currency}
              fxRates={fxRates}
            />
          </div>
        );
      })}
    </div>
  );
};
