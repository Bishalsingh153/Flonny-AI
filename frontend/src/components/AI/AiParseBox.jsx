import React, { useContext, useRef, useState } from 'react';
import { X, Check, Sparkles, Mic, ImagePlus } from 'lucide-react';
import { FinanceContext } from '../../context/FinanceContext';
import { CURRENCIES } from '../../constants/currencies';
import { getCategoryBadgeClass } from '../../constants/categories';

export const AiParseBox = () => {
  const {
    aiInput,
    setAiInput,
    isAiParsing,
    handleAiParse,
    handleReceiptParse,
    aiPreview,
    setAiPreview,
    handleApproveAiPreview,
    currency
  } = useContext(FinanceContext);

  const fileRef = useRef(null);
  const [listening, setListening] = useState(false);
  const currentCurrencySymbol = CURRENCIES[currency] || '₹';

  const startVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      alert('Voice logging needs Chrome or Edge (Web Speech API).');
      return;
    }
    const rec = new Recognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setAiInput(text);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <div className="animate-fade-in">
      <div className="ai-box-container">
        <div className="ai-box-header">
          Log with text, voice, or a receipt photo
        </div>
        <form onSubmit={handleAiParse} className="ai-input-wrapper">
          <input
            type="text"
            className="ai-input"
            placeholder={`Just say: "Spent ${currentCurrencySymbol}250 on lunch at Tokyo Dine today"...`}
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            disabled={isAiParsing}
          />
          <button type="button" className={`btn btn-secondary ${listening ? 'listening' : ''}`} onClick={startVoice} disabled={isAiParsing} title="Voice log">
            <Mic size={16} />
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={isAiParsing} title="Upload receipt">
            <ImagePlus size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleReceiptParse(file);
              e.target.value = '';
            }}
          />
          <button type="submit" className="btn btn-ai" disabled={isAiParsing}>
            {isAiParsing ? (<><div className="spinner"></div> Parsing...</>) : 'Log with AI'}
          </button>
        </form>
        <div className="ai-box-suggestion">
          Suggestions:
          <span className="ai-box-suggestion-chip" onClick={() => setAiInput(`Coffee at Starbucks for ${currentCurrencySymbol}200 yesterday`)}>
            Coffee at Starbucks for {currentCurrencySymbol}200 yesterday
          </span>
          <span className="ai-box-suggestion-chip" onClick={() => setAiInput(`UPI to landlord rent ${currentCurrencySymbol}18000`)}>
            UPI rent {currentCurrencySymbol}18000
          </span>
        </div>
      </div>

      {aiPreview && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                Verify AI Log
              </h3>
              <button className="modal-close" onClick={() => setAiPreview(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="ai-preview-box">
              <div className="ai-preview-title">Parsed Transaction</div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Amount:</span>
                <span className="ai-preview-val" style={{ color: aiPreview.type === 'income' ? 'var(--success)' : 'inherit' }}>
                  {aiPreview.type === 'income' ? '+' : '-'}{currentCurrencySymbol}{Number(aiPreview.amount || 0).toFixed(2)}
                  {aiPreview.original_currency && aiPreview.original_currency !== currency ? ` (${aiPreview.original_currency})` : ''}
                </span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Type:</span>
                <span className="ai-preview-val" style={{ textTransform: 'capitalize' }}>{aiPreview.type}</span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Category:</span>
                <span className="ai-preview-val">
                  <span className={`category-badge ${getCategoryBadgeClass(aiPreview.category)}`}>
                    {aiPreview.category}
                  </span>
                </span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Merchant / Payee:</span>
                <span className="ai-preview-val">{aiPreview.merchant || 'N/A'}</span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Date:</span>
                <span className="ai-preview-val">{aiPreview.date}</span>
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Description:</span>
                <span className="ai-preview-val">{aiPreview.description || 'N/A'}</span>
              </div>
              {aiPreview.split_with ? (
                <div className="ai-preview-item">
                  <span className="ai-preview-label">Split with:</span>
                  <span className="ai-preview-val">{aiPreview.split_with}</span>
                </div>
              ) : null}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              Review these parsed values. Approve to write them to your ledger (amounts convert to INR as the base currency).
            </p>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setAiPreview(null)}>Cancel</button>
              <button className="btn" onClick={handleApproveAiPreview}>
                <Check size={16} />
                Approve & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
