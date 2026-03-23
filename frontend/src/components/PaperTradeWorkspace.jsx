import React, { useState, useMemo } from 'react';
import { usePaperTrade, usePaperTradeConfig } from '../hooks/usePaperTrade';
import { useWorld } from './WorldProvider';
import { 
  TrendingUp, TrendingDown, Activity, DollarSign, Target, 
  PieChart, CheckCircle2, X, ChevronDown
} from 'lucide-react';

export const PaperTradeWorkspace = ({ data, onClose }) => {
  const { isPaperTradeEnabled } = usePaperTradeConfig();
  const { activeWorld } = useWorld();
  const { state, livePositions, analytics, placeOrder, closePosition, closeAllPositions } = usePaperTrade(activeWorld, data);

  const [orderSide, setOrderSide] = useState('BUY');
  const [assetType, setAssetType] = useState('CE');
  const [qty, setQty] = useState(50);
  const initialSpot = data?.analytics?.spot || data?.spot || 0;
  const [selectedStrike, setSelectedStrike] = useState(initialSpot ? Math.round(initialSpot / 50) * 50 : 0);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  const formatCompact = (val) => new Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(val || 0);
  
  const { displayStrikes, atmStrike } = useMemo(() => {
    const spot = data?.analytics?.spot || data?.spot;
    if (!data?.optionChain || !Array.isArray(data.optionChain) || !spot) return { displayStrikes: [], atmStrike: 0 };
    
    // Safely extract valid numerical strikes
    const validStrikes = data.optionChain.map(r => r?.strike).filter(s => typeof s === 'number');
    const uniqueStrikes = [...new Set(validStrikes)].sort((a, b) => a - b);
    if (!uniqueStrikes.length) return { displayStrikes: [], atmStrike: 0 };
    
    let atm = uniqueStrikes[0];
    let minDiff = Math.abs(uniqueStrikes[0] - spot);
    for (const str of uniqueStrikes) {
      if (Math.abs(str - spot) < minDiff) {
        minDiff = Math.abs(str - spot);
        atm = str;
      }
    }
    
    const atmIdx = uniqueStrikes.indexOf(atm);
    const start = Math.max(0, atmIdx - 5);
    const end = Math.min(uniqueStrikes.length - 1, atmIdx + 5);
    return { displayStrikes: uniqueStrikes.slice(start, end + 1), atmStrike: atm };
  }, [data]);

  // Synchronize selected strike with ATM by default
  React.useEffect(() => {
    if (atmStrike && selectedStrike === 0) {
      setSelectedStrike(atmStrike);
    }
  }, [atmStrike, selectedStrike]);

  const liveOrderPrice = useMemo(() => {
    if (!data) return 0;
    const spot = data?.analytics?.spot || data?.spot;
    const futures = data?.analytics?.futures || data?.futures || spot;
    
    if (assetType === 'SPOT') return spot;
    if (assetType === 'FUTURES') return futures;
    
    if (assetType === 'CE' || assetType === 'PE') {
      const strikeRow = data.optionChain?.find(r => r?.strike === selectedStrike);
      if (strikeRow) {
        return assetType === 'CE' ? strikeRow.callLtp || 0 : strikeRow.putLtp || 0;
      }
    }
    return 0;
  }, [data, assetType, selectedStrike]);

  const handlePlaceOrder = () => {
    if (liveOrderPrice <= 0) {
      alert("Invalid price. Please select a valid strike from the chain.");
      return;
    }
    placeOrder({
      assetType,
      side: orderSide,
      entryPrice: liveOrderPrice,
      qty: Number(qty),
      strike: assetType === 'CE' || assetType === 'PE' ? selectedStrike : null,
      symbol: activeWorld === 'nifty' ? 'NIFTY' : 'BANKNIFTY'
    });
  };

  if (!isPaperTradeEnabled) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'var(--bg-base)', overflowY: 'auto', overflowX: 'hidden',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Workspace Header (Sticky Mobile) */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--green), #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={16} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.5 }}>Paper Trade</div>
            <div style={{ fontSize: 10, color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>NIFTY SIMULATION</div>
          </div>
        </div>
        <button className="btn ghost icon-only" onClick={onClose} style={{ borderRadius: '50%', color: 'var(--text-primary)' }}>
          <X size={20} />
        </button>
      </div>

      <div className="content stack fade-in" style={{ padding: '16px', maxWidth: 640, margin: '0 auto', width: '100%', paddingBottom: 100 }}>
        
        {/* Mobile Hero P&L Dashboard */}
        <div className="card groww-card" style={{ padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -20, opacity: 0.03 }}>
            <Activity size={140} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Total Value
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: 'var(--text-primary)', margin: '4px 0 12px' }}>
            {formatCurrency(analytics.currentEquity)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ 
              fontSize: 16, fontWeight: 800, 
              color: analytics.liveUnrealized >= 0 ? 'var(--green)' : 'var(--red)',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              {analytics.liveUnrealized >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {analytics.liveUnrealized >= 0 ? '+' : ''}{formatCurrency(analytics.liveUnrealized)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, background: 'var(--bg-inset)', padding: '4px 8px', borderRadius: 12 }}>
              Live MTM
            </div>
          </div>
        </div>

        {/* Invested & Cash Row */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="card" style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>Invested</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(analytics.totalInvested)}</div>
          </div>
          <div className="card" style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>Cash</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(analytics.availableMargin)}</div>
          </div>
        </div>

        {/* Active Positions (Mobile Card List instead of Table) */}
        <div className="stack" style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800 }}>
              <Target size={16} style={{ color: 'var(--text-accent)' }} /> 
              Live Positions
              <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.1)', padding: '2px 6px', borderRadius: 10, color: 'var(--text-accent)' }}>{livePositions.length}</span>
            </div>
            {livePositions.length > 0 && (
              <button 
                onClick={closeAllPositions} 
                style={{ fontSize: 12, color: 'var(--red)', background: 'transparent', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Exit All
              </button>
            )}
          </div>

          {livePositions.length === 0 ? (
            <div className="card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, borderStyle: 'dashed' }}>
              No active trades. Execute below!
            </div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {livePositions.map(pos => {
                const isProfit = pos.pnl >= 0;
                return (
                  <div key={pos.id} className="card slide-up-1" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ 
                          fontSize: 10, fontWeight: 800, padding: '4px 6px', borderRadius: 4, 
                          background: pos.side === 'BUY' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: pos.side === 'BUY' ? 'var(--green)' : 'var(--red)'
                        }}>
                          {pos.side}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>
                          {pos.symbol} {pos.strike ? `${pos.strike} ${pos.assetType}` : pos.assetType}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Qty: {pos.qty}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Entry: ₹{(pos.entryPrice || 0).toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>LTP: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>₹{pos.currentPrice != null ? pos.currentPrice.toFixed(2) : '—'}</span></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: isProfit ? 'var(--green)' : 'var(--red)', fontSize: 18, marginBottom: 2 }}>
                          {isProfit ? '+' : ''}₹{(pos.pnl || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: 11, color: isProfit ? 'var(--green)' : 'var(--red)', fontWeight: 700, opacity: 0.9 }}>
                          {isProfit ? '+' : ''}{(pos.pnlPercent || 0).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        className="btn secondary btn-full" 
                        style={{ height: 36, fontSize: 13, color: 'var(--text-primary)' }}
                        onClick={() => closePosition(pos.id)}
                      >
                        Square Off
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Execution Order Panel */}
        <div className="stack" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, margin: '8px 0 4px', padding: '0 4px' }}>Quick Execution</div>
          
          <div className="card groww-card" style={{ padding: 20 }}>
            {/* Buy / Sell Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
              {['BUY', 'SELL'].map(s => (
                <button 
                  key={s}
                  style={{
                    flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 800, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: orderSide === s ? (s === 'BUY' ? 'var(--green)' : 'var(--red)') : 'transparent',
                    color: orderSide === s ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setOrderSide(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Asset Strategy */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['CE', 'PE', 'FUTURES'].map(t => (
                <button
                  key={t}
                  style={{
                    flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                    background: assetType === t ? 'rgba(59,130,246,0.1)' : 'var(--bg-surface-elevated)',
                    border: assetType === t ? '1px solid var(--text-accent)' : '1px solid var(--border-color)',
                    color: assetType === t ? 'var(--text-accent)' : 'var(--text-secondary)'
                  }}
                  onClick={() => setAssetType(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Strike & Qty Row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {(assetType === 'CE' || assetType === 'PE') && (
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Strike</label>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={selectedStrike} 
                      onChange={(e) => setSelectedStrike(Number(e.target.value))}
                      style={{ 
                        width: '100%', padding: '10px 12px', background: 'var(--bg-surface-elevated)', 
                        border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', 
                        fontSize: 14, fontWeight: 700, appearance: 'none'
                      }}
                    >
                      {displayStrikes.length > 0 ? (
                        displayStrikes.map(str => (
                          <option key={str} value={str}>
                             {str} {str === atmStrike ? '(ATM)' : ''}
                          </option>
                        ))
                      ) : (
                        <option value={selectedStrike || 0}>{selectedStrike || 'Fetching...'} (Wait...)</option>
                      )}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: 12, pointerEvents: 'none', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              )}
              
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Qty</label>
                <input 
                  type="number" 
                  value={qty} 
                  onChange={e => setQty(e.target.value)}
                  step="50"
                  style={{ 
                    width: '100%', padding: '10px 12px', background: 'var(--bg-surface-elevated)', 
                    border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', 
                    fontSize: 14, fontWeight: 700, outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '12px 14px', background: 'var(--bg-surface-elevated)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Execute @ Market</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>₹{liveOrderPrice.toFixed(2)}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>Total Premium Required:</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-accent)' }}>
                ₹{(liveOrderPrice * qty).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>

            <button 
              className="btn btn-full"
              style={{ 
                background: orderSide === 'BUY' ? 'linear-gradient(135deg, var(--green), #059669)' : 'linear-gradient(135deg, var(--red), #dc2626)', 
                color: '#fff', fontSize: 15, fontWeight: 800, height: 48, border: 'none', 
                boxShadow: `0 8px 20px ${orderSide === 'BUY' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
              onClick={handlePlaceOrder}
            >
              CONFIRM {orderSide}
            </button>
          </div>
        </div>

        {/* Analytics (Mobile Stack) */}
        <div style={{ fontSize: 15, fontWeight: 800, margin: '24px 0 8px', padding: '0 4px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <PieChart size={16} style={{ color: 'var(--text-accent)' }} /> 
          Performance
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card groww-card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Target size={12} /> Win Rate
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
              {analytics.winRate.toFixed(1)}%
            </div>
          </div>

          <div className="card groww-card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <DollarSign size={12} /> Realized P&L
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: analytics.totalRealized >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {analytics.totalRealized >= 0 ? '+' : ''}{formatCompact(analytics.totalRealized)}
            </div>
          </div>

          <div className="card groww-card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={12} /> Best Trade
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>
              +{formatCompact(analytics.bestTrade)}
            </div>
          </div>

          <div className="card groww-card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingDown size={12} /> Worst
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>
              {formatCompact(analytics.worstTrade)}
            </div>
          </div>
        </div>

        {/* History (Mobile Cards) */}
        {state.history.length > 0 && (
          <div className="stack" style={{ marginTop: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px', marginBottom: 8 }}>
              <CheckCircle2 size={16} /> Past Trades
            </div>
            <div className="stack" style={{ gap: 8 }}>
                {state.history.slice(0, 5).map(trade => {
                  const isProfit = trade.realizedPnL >= 0;
                  return (
                    <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-surface-elevated)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                          {trade.side} {trade.symbol} {trade.strike ? `${trade.strike} ${trade.assetType}` : trade.assetType}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          {trade.qty} Qty • Entry: ₹{trade.entryPrice.toFixed(0)} • Exit: ₹{trade.exitPrice?.toFixed(0)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: isProfit ? 'var(--green)' : 'var(--red)' }}>
                        {isProfit ? '+' : ''}₹{trade.realizedPnL.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
