import { useContext } from 'react';
import { FinanceContext } from '../context/FinanceContext';

export const useBudgets = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useBudgets must be used within a FinanceProvider');
  }
  return {
    budgets: context.budgets,
    handleBudgetChange: context.handleBudgetChange,
  };
};
