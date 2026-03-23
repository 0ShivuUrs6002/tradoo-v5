import React, { useState, useMemo } from 'react';
import { usePaperTrade, usePaperTradeConfig } from '../hooks/usePaperTrade';
import { useWorld } from './WorldProvider';
import { 
  TrendingUp, TrendingDown, Activity, DollarSign, Server, 
  BarChart2, Target, PieChart, ShieldCheck, XCircle, CheckCircle2 
} from 'lucide-react';

export const PaperTradeTab = ({ data }) => {
  const { isPaperTradeEnabled } = usePaperTradeConfig();
  const { activeWorld } = useWorld();
  const { state, livePositions, analytics, placeOrder, closePosition, closeAllPositions } = usePaperTrade(activeWorld, data);

  // Order Window State
  const [orderSide, setOrderSide] = useState('BUY');
  const [assetType, setAssetType] = useState('CE');
  const [qty, setQty] = useState(50); // Default Nifty Lot Size
  const [selectedStrike, setSelectedStrike] = useState(data?.spot ? Math.round(data.spot / 50) * 50 : 0);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  const formatCompact = (val) => new Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(val || 0);
  
  // Try to find the live price for the current order form setup
  const liveOrderPrice = useMemo(() => {
    if (!data) return 0;
    if (assetType === 'SPOT') return data.spot;
    if (assetType === 'FUTURES') return data.futures || data.spot;
    
    if (assetType === 'CE' || assetType === 'PE') {
      const strikeRow = data.optionChain?.find(r => r.strikePrice === selectedStrike);
      if (strikeRow) {
        return assetType === 'CE' ? strikeRow.ce?.ltp || 0 : strikeRow.pe?.ltp || 0;
      }
    }
    return 0;
  }, [data, assetType, selectedStrike]);

  const handlePlaceOrder = () => {
    if (liveOrderPrice <= 0) {
      alert("Invalid price. Please select a valid strike.");
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
    <div className="fade-in stack" style={{ paddingBottom: 60 }}>
      {/* 1. Hero P&L Dashboard (Groww Inspired) */}
      <div className="grid2" style={{ gap: 16 }}>
        {/* Main Equity & Live Unrealized */}
        <div className="card groww-card" style={{ padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.03 }}>
            <Activity size={180} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            Current Portfolio Value
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, color: 'var(--text-primary)', marginBottom: 8 }}>
            {formatCurrency(analytics.currentEquity)}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              fontSize: 18, fontWeight: 700, 
              color: analytics.liveUnrealized >= 0 ? 'var(--green)' : 'var(--red)',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              {analytics.liveUnrealized >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              {analytics.liveUnrealized >= 0 ? '+' : ''}{formatCurrency(analytics.liveUnrealized)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-inset)', padding: '4px 10px', borderRadius: 20 }}>
              Live 1D Return
            </div>
          </div>
        </div>

        {/* Invested & Margin Breakdown */}
        <div className="grid2" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Invested Amount</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(analytics.totalInvested)}</div>
          </div>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Available Cash</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(analytics.availableMargin)}</div>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: 'flex-start', gridTemplateColumns: '1fr 340px' }}>
        
        {/* 2. Active Positions & History */}
        <div className="stack">
          {/* Active Positions */}
          <div className="card slide-up-2" style={{ padding: '0' }}>
            <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                <Target size={18} style={{ color: 'var(--text-accent)' }} /> 
                Live Positions 
                <span style={{ fontSize: 11, background: 'var(--bg-inset)', padding: '2px 8px', borderRadius: 12, marginLeft: 8 }}>{livePositions.length}</span>
              </div>
              {livePositions.length > 0 && (
                <button className="btn ghost" onClick={closeAllPositions} style={{ fontSize: 12, color: 'var(--red)', height: 32, padding: '0 12px' }}>
                  Exit All Live
                </button>
              )}
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-inset)', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5 }}>
                    <th style={{ padding: '12px 24px', fontWeight: 600 }}>Asset</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Qty</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Avg. Price</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>LTP</th>
                    <th style={{ padding: '12px', fontWeight: 600, textAlign: 'right' }}>Real-time P&L</th>
                    <th style={{ padding: '12px 24px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {livePositions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        No active positions right now. Take a trade!
                      </td>
                    </tr>
                  ) : livePositions.map(pos => {
                    const isProfit = pos.pnl >= 0;
                    return (
                      <tr key={pos.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-inset)' } }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ 
                              fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, 
                              background: pos.side === 'BUY' ? 'var(--green-muted)' : 'var(--red-muted)',
                              color: pos.side === 'BUY' ? 'var(--green)' : 'var(--red)'
                            }}>
                              {pos.side}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>
                              {pos.symbol} {pos.strike ? `${pos.strike} ${pos.assetType}` : pos.assetType}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 600 }}>{pos.qty}</td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>₹{pos.entryPrice.toFixed(2)}</td>
                        <td style={{ padding: '16px', fontWeight: 600 }}>₹{pos.currentPrice?.toFixed(2) || '—'}</td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: isProfit ? 'var(--green)' : 'var(--red)', fontSize: 15 }}>
                            {isProfit ? '+' : ''}₹{pos.pnl.toFixed(2)}
                          </div>
                          <div style={{ fontSize: 11, color: isProfit ? 'var(--green)' : 'var(--red)', opacity: 0.8 }}>
                            {isProfit ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <button 
                            className="btn ghost" 
                            style={{ height: 32, padding: '0 16px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)' }}
                            onClick={() => closePosition(pos.id)}
                          >
                            Exit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade History Minified */}
          <div className="card slide-up-3" style={{ padding: '24px' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, marginBottom: 16 }}>
              <CheckCircle2 size={16} /> Recent Closed Trades
            </div>
            {state.history.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No closed trades yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {state.history.slice(0, 5).map(trade => {
                  const isProfit = trade.realizedPnL >= 0;
                  return (
                    <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-inset)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {trade.side} {trade.symbol} {trade.strike ? `${trade.strike} ${trade.assetType}` : trade.assetType}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Qty: {trade.qty} • Entry: ₹{trade.entryPrice.toFixed(2)} • Exit: ₹{trade.exitPrice?.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: isProfit ? 'var(--green)' : 'var(--red)' }}>
                        {isProfit ? '+' : ''}₹{trade.realizedPnL.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. Order Window (Right Sidebar) */}
        <div className="card slide-up-4" style={{ padding: 24, position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, letterSpacing: -0.5 }}>Place Order</div>

          <div style={{ display: 'flex', background: 'var(--bg-inset)', borderRadius: 8, padding: 4, marginBottom: 20 }}>
            {['BUY', 'SELL'].map(s => (
              <button 
                key={s}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Asset Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['CE', 'PE', 'FUTURES'].map(t => (
                <button
                  key={t}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                    background: assetType === t ? 'var(--bg-surface)' : 'transparent',
                    border: assetType === t ? '1px solid var(--text-accent)' : '1px solid var(--border)',
                    color: assetType === t ? 'var(--text-accent)' : 'var(--text-secondary)'
                  }}
                  onClick={() => setAssetType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {(assetType === 'CE' || assetType === 'PE') && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Select Strike</label>
              <select 
                value={selectedStrike} 
                onChange={(e) => setSelectedStrike(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}
              >
                {data?.optionChain ? (
                  data.optionChain.map(r => (
                    <option key={r.strikePrice} value={r.strikePrice}>{r.strikePrice}</option>
                  ))
                ) : (
                  <option value={selectedStrike}>{selectedStrike} (Fetching...)</option>
                )}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Quantity (Lots × Size)</label>
            <input 
              type="number" 
              value={qty} 
              onChange={e => setQty(e.target.value)}
              step="50"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '12px', background: 'var(--bg-inset)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Estimated Price</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>₹{liveOrderPrice.toFixed(2)}</div>
          </div>

          <button 
            className="btn btn-full"
            style={{ 
              background: orderSide === 'BUY' ? 'var(--green)' : 'var(--red)', 
              color: '#fff', 
              fontSize: 15, 
              height: 48, 
              border: 'none', 
              boxShadow: `0 8px 16px ${orderSide === 'BUY' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
            }}
            onClick={handlePlaceOrder}
          >
            {orderSide} {qty} Qty @ Market
          </button>
        </div>
      </div>

      {/* 4. Advanced Analytics Hub */}
      <h3 style={{ marginTop: 24, marginBottom: 16, fontSize: 18, fontWeight: 800, display: 'flex', gap: 8, alignItems: 'center' }}>
        <PieChart size={20} style={{ color: 'var(--text-accent)' }} /> 
        Performance Analytics
      </h3>
      <div className="grid4 slide-up-5">
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            <Target size={14} /> Win Rate
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {analytics.winRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Across {analytics.totalTrades} closed trades</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            <DollarSign size={14} /> Realized P&L
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: analytics.totalRealized >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {analytics.totalRealized >= 0 ? '+' : ''}₹{formatCompact(analytics.totalRealized)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Total locked profits</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            <TrendingUp size={14} /> Best Trade
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>
            +₹{formatCompact(analytics.bestTrade)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Maximum single trade profit</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            <TrendingDown size={14} /> Worst Trade
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>
            ₹{formatCompact(analytics.worstTrade)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Maximum single trade loss</div>
        </div>
      </div>
    </div>
  );
};
