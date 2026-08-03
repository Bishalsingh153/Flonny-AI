import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';

export const TransactionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingTransaction, 
  currencySymbol 
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: 'Food & Dining',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        amount: editingTransaction.amount.toString(),
        type: editingTransaction.type,
        category: editingTransaction.category,
        merchant: editingTransaction.merchant || '',
        date: editingTransaction.date,
        description: editingTransaction.description || ''
      });
    } else {
      setFormData({
        amount: '',
        type: 'expense',
        category: 'Food & Dining',
        merchant: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
    }
  }, [editingTransaction, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">
            {editingTransaction ? 'Edit Ledger Record' : 'Log Transaction'}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Amount ({currencySymbol})</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-control"
                required
                placeholder="500.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Transaction Flow</label>
              <select 
                className="form-control"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="expense">Expense (-)</option>
                <option value="income">Income (+)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select 
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                className="form-control"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Merchant / Payee</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="e.g. Starbucks, Amazon, Acme Corp"
              value={formData.merchant}
              onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Description / Note</label>
            <textarea 
              className="form-control"
              style={{ height: '70px', resize: 'none' }}
              placeholder="Additional details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn">
              {editingTransaction ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
