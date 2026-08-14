import React, { useState, useEffect, useContext } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { FinanceContext } from '../../context/FinanceContext';
import { toDisplay } from '../../utils/displayAmount';
import { Modal } from '../UI/Modal';

export const TransactionModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingTransaction,
  currencySymbol
}) => {
  const { currency, fxRates } = useContext(FinanceContext);

  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: 'Food & Dining',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    split_with: ''
  });

  useEffect(() => {
    if (editingTransaction) {
      const displayAmt = toDisplay(editingTransaction.amount, currency, fxRates);
      setFormData({
        amount: displayAmt.toString(),
        type: editingTransaction.type,
        category: editingTransaction.category,
        merchant: editingTransaction.merchant || '',
        date: editingTransaction.date,
        description: editingTransaction.description || '',
        split_with: editingTransaction.split_with || ''
      });
    } else {
      setFormData({
        amount: '',
        type: 'expense',
        category: 'Food & Dining',
        merchant: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        split_with: ''
      });
    }
  }, [editingTransaction, isOpen, currency, fxRates]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      original_amount: parseFloat(formData.amount)
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTransaction ? 'Edit Ledger Record' : 'Log Transaction'}
    >
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
              <select className="form-control" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="expense">Expense (-)</option>
                <option value="income">Income (+)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select className="form-control" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" className="form-control" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label>Merchant / Payee</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Swiggy, Amazon, landlord"
              value={formData.merchant}
              onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Split with (optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Roommate, friend, family..."
              value={formData.split_with}
              onChange={(e) => setFormData({ ...formData, split_with: e.target.value })}
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
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn">
              {editingTransaction ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
    </Modal>
  );
};
