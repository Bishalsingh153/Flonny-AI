import React from 'react';

export const MetricCard = ({ title, value, change, changeType, icon: Icon, changeIcon: ChangeIcon }) => {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span>{title}</span>
        {Icon && (
          <div className="metric-icon-wrapper">
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="metric-value" style={{ color: changeType === 'negative' && title.includes('Balance') ? 'var(--error)' : 'inherit' }}>
        {value}
      </div>
      {change && (
        <div className={`metric-change ${changeType}`}>
          {ChangeIcon && <ChangeIcon size={12} />}
          <span>{change}</span>
        </div>
      )}
    </div>
  );
};
