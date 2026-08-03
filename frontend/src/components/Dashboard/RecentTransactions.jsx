import React from 'react';
import { ReceiptText } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { EmptyState } from '../UI/EmptyState';

export const RecentTransactions = ({ transactions, currencySymbol }) => {
  if (transactions.length === 0) {
    return (
      <EmptyState 
        icon={ReceiptText} 
        message="No transactions logged. Use the AI Box above to log one instantly!" 
      />
    );
  }

  return (
    <table className="floony-table">
      <thead>
        <tr>
          <th>Details</th>
          <th>Category</th>
          <th>Date</th>
          <th style={{ textAlign: 'right' }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {transactions.slice(0, 5).map(t => (
          <tr key={t.id}>
            <td>
              <div style={{ fontWeight: 600 }}>{t.merchant || 'Unknown Merchant'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.description || 'No description'}</div>
            </td>
            <td>
              <Badge category={t.category} />
            </td>
            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.date}</td>
            <td style={{ textAlign: 'right' }} className={`table-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
              {t.type === 'income' ? '+' : '-'}{currencySymbol}{t.amount.toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
