import { useContext } from 'react';
import { FinanceContext } from '../context/FinanceContext';

export const useTransactions = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useTransactions must be used within a FinanceProvider');
  }
  return {
    transactions: context.transactions,
    addTransaction: context.addTransaction,
    updateTransaction: context.updateTransaction,
    deleteTransaction: context.deleteTransaction,
  };
};
