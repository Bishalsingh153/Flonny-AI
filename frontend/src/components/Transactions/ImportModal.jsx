import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Modal } from '../UI/Modal';

export const ImportModal = ({ isOpen, onClose }) => {
  const { previewImport, confirmImport } = useContext(FinanceContext);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file) => {
    const text = await file.text();
    setBusy(true);
    try {
      const data = await previewImport(text);
      setRows(data.rows || []);
      setStats({ total: data.total, duplicates: data.duplicates });
    } finally {
      setBusy(false);
    }
  };

  const toggleSkip = (idx) => {
    setRows(rows.map((r, i) => (i === idx ? { ...r, skip: !r.skip } : r)));
  };

  const save = async () => {
    setBusy(true);
    try {
      await confirmImport(rows.filter((r) => !r.duplicate && !r.skip));
      setRows([]);
      setStats(null);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import statement CSV" wide>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Works with Floony exports and common Indian bank columns (Date, Narration, Withdrawal, Deposit). Duplicates (same date, amount, merchant) are skipped.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {stats && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
            {stats.total} rows parsed · {stats.duplicates} duplicates flagged
          </p>
        )}
        {rows.length > 0 && (
          <div className="table-container" style={{ maxHeight: '320px', marginTop: '1rem' }}>
            <table className="floony-table">
              <thead>
                <tr>
                  <th>Include</th>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Flag</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <input type="checkbox" checked={!r.skip && !r.duplicate} disabled={r.duplicate} onChange={() => toggleSkip(i)} />
                    </td>
                    <td>{r.date}</td>
                    <td>{r.merchant}</td>
                    <td>{r.category}</td>
                    <td>{r.type === 'income' ? '+' : '-'}{Number(r.amount).toFixed(2)}</td>
                    <td>{r.duplicate ? 'Duplicate' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || !rows.some((r) => !r.duplicate && !r.skip)} onClick={save}>
            Import selected
          </button>
        </div>
    </Modal>
  );
};
