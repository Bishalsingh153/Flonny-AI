import React, { useContext } from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { FinanceContext } from '../../context/FinanceContext';
import { CURRENCIES } from '../../constants/currencies';
import { getCategoryBadgeClass } from '../../constants/categories';

export const AiParseBox = () => {
  const {
    aiInput,
    setAiInput,
    isAiParsing,
    handleAiParse,
    aiPreview,
    setAiPreview,
    handleApproveAiPreview,
    currency
  } = useContext(FinanceContext);

  const currentCurrencySymbol = CURRENCIES[currency] || '₹';

  return (
    <div className="animate-fade-in">
      <div className="ai-box-container">
        <div className="ai-box-header">
          <Sparkles size={14} />
          Natural Language Quick Log
        </div>
        <form onSubmit={handleAiParse} className="ai-input-wrapper">
          <input 
            type="text" 
            className="ai-input"
            placeholder={`Just say: "Spent ${currentCurrencySymbol}250 on lunch at Tokyo Dine today" or "Salary credit ${currentCurrencySymbol}50000"...`}
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            disabled={isAiParsing}
          />
          <button type="submit" className="btn btn-ai" disabled={isAiParsing}>
            {isAiParsing ? (
              <>
                <div className="spinner"></div>
                Parsing...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Log with AI
              </>
            )}
          </button>
        </form>
        <div className="ai-box-suggestion">
          Suggestions: 
          <span className="ai-box-suggestion-chip" onClick={() => setAiInput(`Coffee at Starbucks for ${currentCurrencySymbol}200 yesterday`)}>
            Coffee at Starbucks for {currentCurrencySymbol}200 yesterday
          </span>
          <span className="ai-box-suggestion-chip" onClick={() => setAiInput(`Freelance client paid me ${currentCurrencySymbol}15000`)}>
            Freelance client paid me {currentCurrencySymbol}15000
          </span>
        </div>
      </div>

      {/* AI PARSE PREVIEW MODAL */}
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
              <div className="ai-preview-title">
                Parsed Transaction
              </div>
              <div className="ai-preview-item">
                <span className="ai-preview-label">Amount:</span>
                <span className="ai-preview-val" style={{ color: aiPreview.type === 'income' ? 'var(--success)' : 'inherit' }}>
                  {aiPreview.type === 'income' ? '+' : '-'}{currentCurrencySymbol}{aiPreview.amount?.toFixed(2)}
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
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              Review these parsed parameters carefully. Clicking "Approve & Save" will log this immediately to your secure SQLite ledger database.
            </p>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setAiPreview(null)}>
                Cancel
              </button>
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
