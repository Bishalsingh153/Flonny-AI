import React from 'react';

export const Button = ({ children, className = '', disabled, loading, type = 'button', ...props }) => {
  return (
    <button type={type} className={`btn ${className}`} disabled={disabled || loading} {...props}>
      {loading ? (
        <div className="spinner"></div>
      ) : children}
    </button>
  );
};
