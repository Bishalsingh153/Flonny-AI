import React from 'react';

export const InsightCard = ({ title, description, icon: Icon, iconClass }) => {
  return (
    <div className="insight-card">
      {Icon && (
        <div className={`insight-icon-wrapper ${iconClass}`}>
          <Icon size={16} />
        </div>
      )}
      <h4 className="insight-title">{title}</h4>
      <p className="insight-desc">{description}</p>
    </div>
  );
};
