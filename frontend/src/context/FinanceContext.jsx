import React, { createContext, useState, useEffect, useContext } from 'react';
import confetti from 'canvas-confetti';
import { AuthContext } from './AuthContext';
import { API_BASE } from '../services/api';

export const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  const { token, authFetch } = useContext(AuthContext);
  
  const [currency, setCurrency] = useState(localStorage.getItem('floony_currency') || 'INR');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  
  // AI Parsing State
  const [aiInput, setAiInput] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);

  // AI Chat State
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm Floony AI, your personal financial advisor. Ask me questions like:\n- *'Am I spending too much on food?'*\n- *'Give me 3 tips to save money'* \n- *'Analyze my spending habits'*."
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiChatting, setIsAiChatting] = useState(false);
  const [aiStatus, setAiStatus] = useState('Checking...');

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#8b5cf6', '#10b981']
    });
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const tRes = await authFetch(`${API_BASE}/transactions`);
      const tData = await tRes.json();
      setTransactions(tData);

      const bRes = await authFetch(`${API_BASE}/budgets`);
      const bData = await bRes.json();
      setBudgets(bData);
    } catch (error) {
      console.error('Error fetching ledger data:', error);
    }
  };

  const checkAiStatus = async () => {
    if (!token) return;
    try {
      await authFetch(`${API_BASE}/ai/parse`, {
        method: 'POST',
        body: JSON.stringify({ text: 'test' })
      });
      setAiStatus('Operational');
    } catch (e) {
      setAiStatus('Offline');
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      checkAiStatus();
    } else {
      setTransactions([]);
      setBudgets([]);
      setChatHistory([
        {
          role: 'assistant',
          content: "Hello! I'm Floony AI, your personal financial advisor. Ask me questions like:\n- *'Am I spending too much on food?'*\n- *'Give me 3 tips to save money'* \n- *'Analyze my spending habits'*."
        }
      ]);
    }
  }, [token]);

  // AI Parsing Handler
  const handleAiParse = async (e) => {
    if (e) e.preventDefault();
    if (!aiInput.trim()) return;

    setIsAiParsing(true);
    try {
      const res = await authFetch(`${API_BASE}/ai/parse`, {
        method: 'POST',
        body: JSON.stringify({ text: aiInput })
      });
      const data = await res.json();
      setAiPreview(data);
    } catch (error) {
      console.error('AI parsing error:', error);
    } finally {
      setIsAiParsing(false);
    }
  };

  // Approve AI Parsed Transaction
  const handleApproveAiPreview = async () => {
    if (!aiPreview) return;
    try {
      const res = await authFetch(`${API_BASE}/transactions`, {
        method: 'POST',
        body: JSON.stringify(aiPreview)
      });
      const newTx = await res.json();
      setTransactions([newTx, ...transactions]);
      setAiPreview(null);
      setAiInput('');
      triggerCelebration();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  // AI Chat Handler
  const handleAiChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsAiChatting(true);

    try {
      const res = await authFetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({ chatHistory: updatedHistory })
      });
      const data = await res.json();
      setChatHistory([...updatedHistory, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setChatHistory([...updatedHistory, { role: 'assistant', content: 'Oops! I encountered an error connecting to my core brain. Please try again.' }]);
    } finally {
      setIsAiChatting(false);
    }
  };

  // CRUD transaction helper calls
  const addTransaction = async (dataToSend) => {
    const res = await authFetch(`${API_BASE}/transactions`, {
      method: 'POST',
      body: JSON.stringify(dataToSend)
    });
    const created = await res.json();
    setTransactions([created, ...transactions]);
    triggerCelebration();
    return created;
  };

  const updateTransaction = async (id, dataToSend) => {
    const res = await authFetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dataToSend)
    });
    const updated = await res.json();
    setTransactions(transactions.map(t => t.id === id ? updated : t));
    return updated;
  };

  const deleteTransaction = async (id) => {
    await authFetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE'
    });
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // Budget Adjuster
  const handleBudgetChange = async (category, amount) => {
    try {
      const res = await authFetch(`${API_BASE}/budgets`, {
        method: 'POST',
        body: JSON.stringify({ category, amount: parseFloat(amount) })
      });
      const updated = await res.json();
      
      const exists = budgets.some(b => b.category === category);
      if (exists) {
        setBudgets(budgets.map(b => b.category === category ? updated : b));
      } else {
        setBudgets([...budgets, updated]);
      }
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const updateCurrency = (newVal) => {
    setCurrency(newVal);
    localStorage.setItem('floony_currency', newVal);
  };

  return (
    <FinanceContext.Provider value={{
      currency,
      setCurrency: updateCurrency,
      transactions,
      budgets,
      aiStatus,
      aiInput,
      setAiInput,
      isAiParsing,
      aiPreview,
      setAiPreview,
      chatHistory,
      setChatHistory,
      chatInput,
      setChatInput,
      isAiChatting,
      handleAiParse,
      handleApproveAiPreview,
      handleAiChat,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      handleBudgetChange,
      fetchData
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
