import React, { useContext } from 'react';
import { Edit2, Trash2, ReceiptText, AlertTriangle } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { EmptyState } from '../UI/EmptyState';
import { FinanceContext } from '../../context/FinanceContext';
import { formatDisplay } from '../../utils/displayAmount';

export const TransactionTable = ({ transactions, onEdit, onDelete }) => {
  const { currency, fxRates } = useContext(FinanceContext);
  const symbol = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' }[currency] || '₹';

  if (transactions.length === 0) {
    return <EmptyState icon={ReceiptText} message="No transactions match your search filters." />;
  }

  return (
    <table className="floony-table">
      <thead>
        <tr>
          <th>Merchant / Payee</th>
          <th>Category</th>
          <th>Date</th>
          <th>Description</th>
          <th style={{ textAlign: 'right' }}>Amount</th>
          <th style={{ textAlign: 'right' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.id}>
            <td>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {t.merchant || 'N/A'}
                {t.is_anomaly ? (
                  <span className="anomaly-flag" title={t.anomaly_reason || 'Unusual amount for this category'}>
                    <AlertTriangle size={12} /> Unusual
                  </span>
                ) : null}
              </div>
              {t.split_with ? <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Split with {t.split_with}</div> : null}
              {t.source && t.source !== 'manual' ? <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.source}</div> : null}
            </td>
            <td><Badge category={t.category} /></td>
            <td style={{ color: 'var(--text-secondary)' }}>{t.date}</td>
            <td style={{ color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.description || '-'}
            </td>
            <td style={{ textAlign: 'right' }} className={`table-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
              {t.type === 'income' ? '+' : '-'}{formatDisplay(t.amount, symbol, currency, fxRates)}
            </td>
            <td style={{ textAlign: 'right' }}>
              <div className="table-actions">
                <button className="icon-btn" onClick={() => onEdit(t)}><Edit2 size={14} /></button>
                <button className="icon-btn delete" onClick={() => onDelete(t.id)}><Trash2 size={14} /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
