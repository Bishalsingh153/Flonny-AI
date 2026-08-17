import React from 'react';
import { ReceiptText, AlertTriangle } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { EmptyState } from '../UI/EmptyState';
import { formatDisplay } from '../../utils/displayAmount';

export const RecentTransactions = ({ transactions, currencySymbol, currency, fxRates }) => {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        message="No transactions in this period. Use the AI box above to log one."
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
        {transactions.slice(0, 5).map((t) => (
          <tr key={t.id}>
            <td>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {t.merchant || 'Unknown Merchant'}
                {t.is_anomaly ? (
                  <span className="anomaly-flag" title={t.anomaly_reason || 'Unusual amount for this category'}>
                    <AlertTriangle size={12} /> Unusual
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.description || 'No description'}</div>
            </td>
            <td><Badge category={t.category} /></td>
            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.date}</td>
            <td style={{ textAlign: 'right' }} className={`table-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
              {t.type === 'income' ? '+' : '-'}{formatDisplay(t.amount, currencySymbol, currency, fxRates)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
