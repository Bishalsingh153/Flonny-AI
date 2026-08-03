import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '../UI/EmptyState';

export const SpendingChart = ({ trendData, currencySymbol }) => {
  if (trendData.length === 0) {
    return (
      <EmptyState 
        icon={TrendingUp} 
        message="No transactions logged. Charts will appear as you record items." 
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={trendData}>
        <defs>
          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
        <Tooltip 
          formatter={(value) => [`${currencySymbol}${value}`, 'Spend']}
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
          itemStyle={{ color: 'var(--primary)' }}
        />
        <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};
