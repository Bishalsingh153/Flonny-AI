import React from 'react';
import { Edit2, Trash2, ReceiptText } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { EmptyState } from '../UI/EmptyState';

export const TransactionTable = ({ transactions, currencySymbol, onEdit, onDelete }) => {
  if (transactions.length === 0) {
    return (
      <EmptyState 
        icon={ReceiptText} 
        message="No transactions match your search filters." 
      />
    );
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
        {transactions.map(t => (
          <tr key={t.id}>
            <td>
              <div style={{ fontWeight: 600 }}>{t.merchant || 'N/A'}</div>
            </td>
            <td>
              <Badge category={t.category} />
            </td>
            <td style={{ color: 'var(--text-secondary)' }}>{t.date}</td>
            <td style={{ color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.description || '-'}
            </td>
            <td style={{ textAlign: 'right' }} className={`table-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
              {t.type === 'income' ? '+' : '-'}{currencySymbol}{t.amount.toFixed(2)}
            </td>
            <td style={{ textAlign: 'right' }}>
              <div className="table-actions">
                <button className="icon-btn" onClick={() => onEdit(t)}>
                  <Edit2 size={14} />
                </button>
                <button className="icon-btn delete" onClick={() => onDelete(t.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
