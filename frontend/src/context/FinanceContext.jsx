import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { AuthContext } from './AuthContext';
import { API_BASE } from '../services/api';
import { getPeriodRange, inPeriod } from '../utils/period';

export const FinanceContext = createContext();

const DEFAULT_CHAT = [
  {
    role: 'assistant',
    content: "Floony here. Humor setting seventy percent. Ask about this month, or tell me to log two hundred for coffee."
  }
];

export const FinanceProvider = ({ children }) => {
  const { token, authFetch } = useContext(AuthContext);

  const [currency, setCurrency] = useState(localStorage.getItem('floony_currency') || 'INR');
  const [fxRates, setFxRates] = useState({ INR: 1 });
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [recurringSuggestions, setRecurringSuggestions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [wrap, setWrap] = useState(null);
  const [forecasts, setForecasts] = useState({});

  const [periodPreset, setPeriodPreset] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [aiInput, setAiInput] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);

  const [chatHistory, setChatHistory] = useState(DEFAULT_CHAT);
  const [chatInput, setChatInput] = useState('');
  const [isAiChatting, setIsAiChatting] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [aiStatus, setAiStatus] = useState('Checking...');

  const periodRange = useMemo(
    () => getPeriodRange(periodPreset, customStart, customEnd),
    [periodPreset, customStart, customEnd]
  );

  const periodTransactions = useMemo(
    () => transactions.filter((t) => inPeriod(t.date, periodRange)),
    [transactions, periodRange]
  );

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#8b5cf6', '#10b981']
    });
  };

  const loadForecasts = async (budgetRows) => {
    const list = (budgetRows || []).filter((b) => Number(b.amount) > 0);
    if (!list.length) {
      setForecasts({});
      return;
    }
    const pairs = await Promise.all(list.map(async (b) => {
      try {
        const res = await authFetch(`${API_BASE}/forecast/${encodeURIComponent(b.category)}`);
        if (!res.ok) return [b.category, null];
        return [b.category, await res.json()];
      } catch {
        return [b.category, null];
      }
    }));
    setForecasts(Object.fromEntries(pairs));
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const [tRes, bRes, gRes, rRes, fxRes, chatRes, insRes] = await Promise.all([
        authFetch(`${API_BASE}/transactions`),
        authFetch(`${API_BASE}/budgets`),
        authFetch(`${API_BASE}/goals`),
        authFetch(`${API_BASE}/recurring`),
        authFetch(`${API_BASE}/fx`),
        authFetch(`${API_BASE}/ai/chat`),
        authFetch(`${API_BASE}/insights`)
      ]);
      setTransactions(await tRes.json());
      const budgetRows = await bRes.json();
      setBudgets(budgetRows);
      setGoals(await gRes.json());
      setRecurring(await rRes.json());
      const fx = await fxRes.json();
      setFxRates(fx.rates || { INR: 1 });
      const chat = await chatRes.json();
      setChatHistory(chat.messages?.length ? chat.messages : DEFAULT_CHAT);
      setInsights(await insRes.json());

      const sugRes = await authFetch(`${API_BASE}/recurring/suggestions`);
      setRecurringSuggestions(await sugRes.json());
      await loadForecasts(budgetRows);
    } catch (error) {
      console.error('Error fetching ledger data:', error);
    }
  };

  const checkAiStatus = async () => {
    try {
      const res = await authFetch(`${API_BASE}/ai/status`);
      const data = await res.json();
      setAiStatus(data.label || 'Ready');
    } catch {
      setAiStatus('Offline');
    }
  };

  const loadWrap = async (month) => {
    const res = await authFetch(`${API_BASE}/wrap${month ? `?month=${month}` : ''}`);
    const data = await res.json();
    setWrap(data);
    return data;
  };

  useEffect(() => {
    if (token) {
      fetchData();
      checkAiStatus();
      loadWrap();
    } else {
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setRecurring([]);
      setInsights(null);
      setWrap(null);
      setForecasts({});
      setChatHistory(DEFAULT_CHAT);
      setPendingAction(null);
    }
  }, [token]);

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
      data.source = data.source || 'nl';
      setAiPreview(data);
    } catch (error) {
      console.error('AI parsing error:', error);
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleReceiptParse = async (file) => {
    if (!file) return;
    setIsAiParsing(true);
    try {
      const form = new FormData();
      form.append('receipt', file);
      const res = await authFetch(`${API_BASE}/ai/parse-receipt`, {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      data.source = 'receipt';
      setAiPreview(data);
    } catch (error) {
      console.error('Receipt parsing error:', error);
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleApproveAiPreview = async () => {
    if (!aiPreview) return;
    try {
      const payload = {
        ...aiPreview,
        original_amount: aiPreview.original_amount ?? aiPreview.amount,
        original_currency: aiPreview.original_currency || currency,
        source: aiPreview.source || 'nl'
      };
      const res = await authFetch(`${API_BASE}/transactions`, {
        method: 'POST',
        body: JSON.stringify(payload)
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

  const handleAiChat = async (e) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const userMessage = { role: 'user', content: text };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory([...updatedHistory, { role: 'assistant', content: '', engine: null }]);
    setChatInput('');
    setIsAiChatting(true);
    setPendingAction(null);

    try {
      const res = await authFetch(`${API_BASE}/ai/chat/stream`, {
        method: 'POST',
        body: JSON.stringify({ chatHistory: updatedHistory })
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      const patchLast = (fields) => {
        setChatHistory((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, ...fields };
          return next;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const line = part.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          let ev;
          try {
            ev = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (ev.type === 'source') {
            patchLast({ engine: ev.engine, notice: ev.notice });
            if (ev.status?.label) setAiStatus(ev.status.label);
          }
          if (ev.type === 'token' && ev.text) {
            if (/GoogleGenerativeAI|Too Many Requests|exceeded your current quota/i.test(ev.text)) {
              full = 'Gemini quota is used up. Answering from your ledger.';
            } else {
              full += ev.text;
            }
            patchLast({ content: full });
          }
          if (ev.type === 'pendingAction') setPendingAction(ev.action);
          if (ev.type === 'error') throw new Error(ev.message || 'Stream error');
        }
      }
      checkAiStatus();
      return full;
    } catch (error) {
      console.error('AI chat error:', error);
      setChatHistory((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role !== 'assistant') return next;
        next[next.length - 1] = {
          ...last,
          engine: last.engine || 'fallback',
          content: last.content
            ? `${last.content}\n\n(Connection dropped. That's all I got.)`
            : 'I hit a connection error. Try that once more?'
        };
        return next;
      });
      return '';
    } finally {
      setIsAiChatting(false);
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const res = await authFetch(`${API_BASE}/ai/confirm-action`, {
      method: 'POST',
      body: JSON.stringify({ action: pendingAction })
    });
    const data = await res.json();
    if (data.transaction) setTransactions([data.transaction, ...transactions]);
    let nextBudgets = budgets;
    if (data.budget) {
      const exists = budgets.some((b) => b.category === data.budget.category);
      nextBudgets = exists ? budgets.map((b) => (b.category === data.budget.category ? data.budget : b)) : [...budgets, data.budget];
      setBudgets(nextBudgets);
    }
    setPendingAction(null);
    triggerCelebration();
    loadForecasts(nextBudgets);
  };

  const clearChat = async () => {
    await authFetch(`${API_BASE}/ai/chat`, { method: 'DELETE' });
    setChatHistory(DEFAULT_CHAT);
    setPendingAction(null);
  };

  const addTransaction = async (dataToSend) => {
    const res = await authFetch(`${API_BASE}/transactions`, {
      method: 'POST',
      body: JSON.stringify({
        ...dataToSend,
        original_amount: dataToSend.original_amount ?? dataToSend.amount,
        original_currency: dataToSend.original_currency || currency,
        source: dataToSend.source || 'manual'
      })
    });
    const created = await res.json();
    setTransactions([created, ...transactions]);
    triggerCelebration();
    loadForecasts(budgets);
    return created;
  };

  const updateTransaction = async (id, dataToSend) => {
    const res = await authFetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...dataToSend,
        original_amount: dataToSend.original_amount ?? dataToSend.amount,
        original_currency: dataToSend.original_currency || currency
      })
    });
    const updated = await res.json();
    setTransactions(transactions.map((t) => (t.id === id ? updated : t)));
    loadForecasts(budgets);
    return updated;
  };

  const deleteTransaction = async (id) => {
    await authFetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
    setTransactions(transactions.filter((t) => t.id !== id));
    loadForecasts(budgets);
  };

  const handleBudgetChange = async (category, amount) => {
    try {
      const res = await authFetch(`${API_BASE}/budgets`, {
        method: 'POST',
        body: JSON.stringify({ category, amount: parseFloat(amount) })
      });
      const updated = await res.json();
      const exists = budgets.some((b) => b.category === category);
      const next = exists ? budgets.map((b) => (b.category === category ? updated : b)) : [...budgets, updated];
      setBudgets(next);
      loadForecasts(next);
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const previewImport = async (csv) => {
    const res = await authFetch(`${API_BASE}/transactions/import/preview`, {
      method: 'POST',
      body: JSON.stringify({ csv })
    });
    return res.json();
  };

  const confirmImport = async (rows) => {
    const res = await authFetch(`${API_BASE}/transactions/import`, {
      method: 'POST',
      body: JSON.stringify({ rows })
    });
    const data = await res.json();
    if (data.transactions?.length) {
      setTransactions([...data.transactions, ...transactions]);
      triggerCelebration();
      loadForecasts(budgets);
    }
    return data;
  };

  const exportCsv = async () => {
    const res = await authFetch(`${API_BASE}/transactions/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floony-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const addGoal = async (payload) => {
    const res = await authFetch(`${API_BASE}/goals`, { method: 'POST', body: JSON.stringify(payload) });
    const created = await res.json();
    setGoals([created, ...goals]);
    return created;
  };

  const updateGoal = async (id, payload) => {
    const res = await authFetch(`${API_BASE}/goals/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    const updated = await res.json();
    setGoals(goals.map((g) => (g.id === id ? updated : g)));
    return updated;
  };

  const deleteGoal = async (id) => {
    await authFetch(`${API_BASE}/goals/${id}`, { method: 'DELETE' });
    setGoals(goals.filter((g) => g.id !== id));
  };

  const addRecurring = async (payload) => {
    const res = await authFetch(`${API_BASE}/recurring`, { method: 'POST', body: JSON.stringify(payload) });
    const created = await res.json();
    setRecurring([...recurring, created]);
    setRecurringSuggestions(recurringSuggestions.filter((s) => s.merchant !== created.merchant));
    return created;
  };

  const deleteRecurring = async (id) => {
    await authFetch(`${API_BASE}/recurring/${id}`, { method: 'DELETE' });
    setRecurring(recurring.filter((r) => r.id !== id));
  };

  const logRecurring = async (id) => {
    const res = await authFetch(`${API_BASE}/recurring/${id}/log`, { method: 'POST', body: JSON.stringify({}) });
    const data = await res.json();
    if (data.transaction) setTransactions([data.transaction, ...transactions]);
    if (data.next_date) {
      setRecurring(recurring.map((r) => (r.id === Number(id) ? { ...r, next_date: data.next_date } : r)));
    }
    triggerCelebration();
    return data;
  };

  const updateCurrency = (newVal) => {
    setCurrency(newVal);
    localStorage.setItem('floony_currency', newVal);
  };

  return (
    <FinanceContext.Provider value={{
      currency,
      setCurrency: updateCurrency,
      fxRates,
      transactions,
      periodTransactions,
      periodPreset,
      setPeriodPreset,
      customStart,
      setCustomStart,
      customEnd,
      setCustomEnd,
      periodRange,
      budgets,
      goals,
      recurring,
      recurringSuggestions,
      insights,
      wrap,
      forecasts,
      loadWrap,
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
      pendingAction,
      setPendingAction,
      handleAiParse,
      handleReceiptParse,
      handleApproveAiPreview,
      handleAiChat,
      confirmPendingAction,
      clearChat,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      handleBudgetChange,
      previewImport,
      confirmImport,
      exportCsv,
      addGoal,
      updateGoal,
      deleteGoal,
      addRecurring,
      deleteRecurring,
      logRecurring,
      fetchData
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
