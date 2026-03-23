import React from 'react';
import { usePaperTrade, usePaperTradeConfig } from '../hooks/usePaperTrade';
import { useWorld } from './WorldProvider';
import { Target, X, Check } from 'lucide-react';

export const PaperTradeTracker = ({ data, onOpenWorkspace }) => {
  const { isPaperTradeEnabled } = usePaperTradeConfig();
  const { activeWorld } = useWorld();
  const { analytics, livePositions, closeAllPositions } = usePaperTrade(activeWorld, data);

  if (!isPaperTradeEnabled) return null;

  const isProfit = analytics.liveUnrealized >= 0;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 16 }}>
      {livePositions.length === 0 ? (
        <button 
          className="btn ghost" 
          onClick={onOpenWorkspace}
          style={{ height: 26, padding: '0 10px', background: 'var(--bg-surface)', borderRadius: 20, border: '1px solid var(--border-color)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Paper Trade
        </button>
      ) : (
        <>
          <button 
            className="btn ghost" 
            onClick={onOpenWorkspace}
            style={{ height: 28, padding: '0 12px', background: 'var(--bg-surface-elevated)', borderRadius: 20, border: '1px solid var(--border-color)', display: 'flex', gap: 6, alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          >
            <Target size={12} style={{ color: 'var(--text-accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isProfit ? 'var(--green)' : 'var(--red)' }}>
              {isProfit ? '+' : ''}₹{analytics.liveUnrealized.toFixed(2)}
            </span>
          </button>

          <button 
            className="btn icon-only" 
            onClick={() => {
              if (window.confirm('Close all live paper trades?')) closeAllPositions();
            }}
            title="Exit All Live Trades"
            style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
};
