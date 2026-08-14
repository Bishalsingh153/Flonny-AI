import React, { useContext, useRef, useEffect } from 'react';
import { Sparkles, Send, Check, X } from 'lucide-react';
import { FinanceContext } from '../../context/FinanceContext';
import { CURRENCIES } from '../../constants/currencies';

function renderMarkdown(content, currencySymbol) {
  return String(content || '')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)$/gm, '• $1')
    .replace(/\$(\d+(\.\d{1,2})?)/g, `${currencySymbol}$1`);
}

function splitEngineNotice(content) {
  const text = String(content || '');
  const match = text.match(/^(Using Gemini[^\n]*|Gemini quota is used up[^\n]*|Gemini is [^\n]*)\n\n([\s\S]*)$/);
  if (match) return { notice: match[1], body: match[2] };
  return { notice: null, body: text };
}

export const ChatPanel = () => {
  const {
    chatHistory,
    chatInput,
    setChatInput,
    isAiChatting,
    handleAiChat,
    aiStatus,
    currency,
    pendingAction,
    confirmPendingAction,
    setPendingAction
  } = useContext(FinanceContext);

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, pendingAction]);

  const currentCurrencySymbol = CURRENCIES[currency] || '₹';
  const last = chatHistory[chatHistory.length - 1];
  const streaming = isAiChatting && last?.role === 'assistant';

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 700 }}>Floony</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {aiStatus || 'Checking Gemini…'}
        </span>
      </div>

      <div className="chat-messages">
        {chatHistory.map((msg, index) => {
          const split = msg.role === 'assistant' ? splitEngineNotice(msg.content) : { notice: msg.notice, body: msg.content };
          const notice = msg.notice || split.notice;
          const engine = msg.engine || (notice && /Using Gemini/i.test(notice) ? 'gemini' : notice ? 'fallback' : null);
          return (
          <div key={index} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'assistant' && notice && (
              <div className={`engine-chip ${engine || ''}`}>{notice}</div>
            )}
            <div
              style={{ whiteSpace: 'pre-line' }}
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(split.body, currentCurrencySymbol) || (streaming && index === chatHistory.length - 1 ? '<span class="stream-caret"></span>' : '')
              }}
            />
          </div>
          );
        })}
        {pendingAction && (
          <div className="pending-action-card">
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Confirm action</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {pendingAction.type === 'log_transaction'
                ? `Log ${pendingAction.payload?.type} ${pendingAction.payload?.amount} · ${pendingAction.payload?.merchant} · ${pendingAction.payload?.category}`
                : `Set ${pendingAction.payload?.category} budget to ${pendingAction.payload?.amount}`}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" type="button" onClick={confirmPendingAction}><Check size={14} /> Confirm</button>
              <button className="btn btn-secondary" type="button" onClick={() => setPendingAction(null)}><X size={14} /> Dismiss</button>
            </div>
          </div>
        )}
        <div ref={chatEndRef}></div>
      </div>

      <form onSubmit={handleAiChat} className="chat-input-form">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask about this month, or tell me to log two hundred for coffee."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={isAiChatting}
        />
        <button type="submit" className="btn btn-ai" disabled={isAiChatting}>
          <Send size={14} />
          Send
        </button>
      </form>
    </div>
  );
};
