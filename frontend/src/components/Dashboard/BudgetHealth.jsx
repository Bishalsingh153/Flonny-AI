import React from 'react';
import { Wallet } from 'lucide-react';
import { EmptyState } from '../UI/EmptyState';

export const BudgetHealth = ({ budgets, categorySpendMap, currencySymbol }) => {
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
      {budgets.map(b => {
        const spent = categorySpendMap[b.category] || 0;
        const percentage = Math.min(Math.round((spent / b.amount) * 100), 100);
        
        let barColor = 'normal';
        if (percentage > 90) barColor = 'danger';
        else if (percentage > 70) barColor = 'warning';

        return (
          <div className="budget-item" key={b.category}>
            <div className="budget-info">
              <span className="budget-name">{b.category}</span>
              <span className="budget-limits">
                {currencySymbol}{spent.toFixed(0)} <span style={{ color: 'var(--text-muted)' }}>/ {currencySymbol}{b.amount}</span>
              </span>
            </div>
            <div className="budget-bar-bg">
              <div 
                className={`budget-bar-fill ${barColor}`} 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
