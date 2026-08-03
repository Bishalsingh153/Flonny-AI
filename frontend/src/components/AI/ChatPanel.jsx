import React, { useContext, useRef, useEffect } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { FinanceContext } from '../../context/FinanceContext';
import { CURRENCIES } from '../../constants/currencies';

export const ChatPanel = () => {
  const {
    chatHistory,
    chatInput,
    setChatInput,
    isAiChatting,
    handleAiChat,
    currency
  } = useContext(FinanceContext);

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const currentCurrencySymbol = CURRENCIES[currency] || '₹';

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 700 }}>Floony Smart Advisor</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Powered by Gemini AI</span>
      </div>

      <div className="chat-messages">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.role}`}>
            <div 
              style={{ whiteSpace: 'pre-line' }} 
              dangerouslySetInnerHTML={{ 
                __html: msg.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/^- (.*)$/gm, '• $1')
                  .replace(/\$(\d+(\.\d{1,2})?)/g, `${currentCurrencySymbol}$1`)
              }}
            />
          </div>
        ))}
        {isAiChatting && (
          <div className="chat-bubble assistant">
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef}></div>
      </div>

      <form onSubmit={handleAiChat} className="chat-input-form">
        <input 
          type="text" 
          className="chat-input"
          placeholder="Ask Floony advisor: 'How did I spend on dining out?' or 'Give me saving strategies'..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={isAiChatting}
        />
        <button type="submit" className="btn btn-ai" disabled={isAiChatting}>
          <Send size={14} />
          Ask AI
        </button>
      </form>
    </div>
  );
};
