import React from 'react';

export const EmptyState = ({ icon: Icon, message, style = {} }) => {
  return (
    <div className="empty-state" style={style}>
      {Icon && <Icon size={24} className="empty-state-icon" />}
      <p>{message}</p>
    </div>
  );
};
