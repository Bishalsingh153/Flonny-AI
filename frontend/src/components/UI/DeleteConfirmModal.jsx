import React from 'react';

export const DeleteConfirmModal = ({
  isOpen,
  onCancel,
  onConfirm,
  message = 'Are you sure you want to delete this?'
}) => {
  if (!isOpen) return null;

  return (
    <div className="delete-modal-overlay">
      <div className="delete-modal">
        <h3>Delete?</h3>

        <p>{message}</p>

        <div className="delete-modal-actions">
          <button onClick={onCancel}>
            Cancel
          </button>

          <button
            className="delete-confirm-btn"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};