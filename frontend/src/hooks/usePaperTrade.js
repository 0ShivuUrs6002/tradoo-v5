import { useState, useEffect, useMemo, useCallback } from 'react';

const INITIAL_BALANCE = 100000;
const STORAGE_KEY = 'TRADO_PAPER_STATE';

// Helper to calculate P&L for a single position based on latest market data
const calculatePositionPnL = (pos, marketData) => {
  let currentPrice = null;
  const { assetType, side, entryPrice, qty, strike } = pos;
  
  // Resolve current price from market data
  if (marketData) {
    if (assetType === 'SPOT') {
      currentPrice = marketData.spot;
    } else if (assetType === 'FUTURES') {
      currentPrice = marketData.futures;
    } else if (assetType === 'CE' || assetType === 'PE') {
      // Find strike in option chain
      const row = marketData.optionChain?.find(r => r.strike === strike);
      if (row) {
        currentPrice = assetType === 'CE' ? row.callLtp : row.putLtp;
      }
    }
  }

  // If we can't find current price exactly, default to entry so PnL stays 0
  const effectivePrice = currentPrice ?? entryPrice;
  const priceDiff = effectivePrice - entryPrice;
  
  // Realized logic: Long (Buy) -> prof is (curr - entry)*qty, Short (Sell) -> prof is (entry - curr)*qty
  const pnl = side === 'BUY' ? priceDiff * qty : -priceDiff * qty;
  
  return {
    ...pos,
    currentPrice: effectivePrice,
    pnl,
    pnlPercent: (pnl / (entryPrice * qty)) * 100
  };
};

export const usePaperTrade = (activeWorld, currentMarketData) => {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse paper trade state', e);
    }
    return {
      balance: INITIAL_BALANCE,
      positions: [], // Active open positions
      history: [],   // Closed trades
    };
  });

  // Sync state to local storage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Derive live positions with updated P&L perfectly based on currentMarketData
  const livePositions = useMemo(() => {
    // We only update purely Indian markets right now based on dashboard data
    return state.positions.map(pos => calculatePositionPnL(pos, currentMarketData));
  }, [state.positions, currentMarketData]);

  // Aggregate live analytics
  const analytics = useMemo(() => {
    const totalInvested = livePositions.reduce((acc, p) => acc + (p.entryPrice * p.qty), 0);
    const liveUnrealized = livePositions.reduce((acc, p) => acc + p.pnl, 0);
    const currentEquity = state.balance + liveUnrealized;
    
    // Historical stats
    const closedPnLs = state.history.map(t => t.realizedPnL);
    const winTrades = closedPnLs.filter(p => p > 0);
    const lossTrades = closedPnLs.filter(p => p <= 0);
    
    const winRate = state.history.length > 0 ? (winTrades.length / state.history.length) * 100 : 0;
    const grossProfit = winTrades.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(lossTrades.reduce((a, b) => a + b, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);
    
    const bestTrade = Math.max(0, ...closedPnLs);
    const worstTrade = Math.min(0, ...closedPnLs);
    const totalRealized = closedPnLs.reduce((a, b) => a + b, 0);

    return {
      totalInvested,
      liveUnrealized,
      currentEquity,
      availableMargin: state.balance,
      winRate,
      profitFactor,
      bestTrade,
      worstTrade,
      totalRealized,
      totalTrades: state.history.length
    };
  }, [state.balance, state.history, livePositions]);

  // ─── Actions ─────────────────────────────────────────

  const placeOrder = useCallback((order) => {
    const { assetType, side, entryPrice, qty, strike, symbol } = order;
    
    // Simple validation (Optional: add margin check)
    if (!qty || !entryPrice) return { success: false, error: 'Invalid order details.' };
    const requiredMargin = entryPrice * qty;
    if (side === 'BUY' && requiredMargin > state.balance) {
       // Allow it for "Paper Trading" flexibility, or enforce margin. 
       // For a strict Groww feel, we should enforce purchasing power.
       // return { success: false, error: 'Insufficient margin.' };
    }

    const newPosition = {
      id: Date.now().toString(),
      openedAt: Date.now(),
      symbol: symbol || 'NIFTY', // e.g., NIFTY, BANKNIFTY
      assetType, // SPOT, FUTURES, CE, PE
      side,      // BUY or SELL
      entryPrice,
      qty,
      strike: strike || null
    };

    setState(prev => ({
      ...prev,
      // For simplicity, paper trades deduct entirely from balance immediately upon open,
      // or we just freeze funds. Let's do simple wallet: deduct cost if buying options, but 
      // let's just track PnL over base balance to avoid short-selling margin complexities.
      // Wait, standard paper trade: keep balance as "Realized Balance".
      // We don't deduct cost from balance. Current Equity = Balance + Unrealized PnL.
      // When trade closes, Balance += Realized PnL.
      positions: [newPosition, ...prev.positions]
    }));
    return { success: true };
  }, [state.balance]);

  const closePosition = useCallback((positionId) => {
    setState(prev => {
      const pos = prev.positions.find(p => p.id === positionId);
      if (!pos) return prev;

      // Calculate final PnL at the moment of closing
      const finalPos = calculatePositionPnL(pos, currentMarketData);
      const realizedPnL = finalPos.pnl;

      const closedTrade = {
        ...pos,
        closedAt: Date.now(),
        exitPrice: finalPos.currentPrice,
        realizedPnL,
        pnlPercent: finalPos.pnlPercent
      };

      return {
        ...prev,
        balance: prev.balance + realizedPnL,
        positions: prev.positions.filter(p => p.id !== positionId),
        history: [closedTrade, ...prev.history],
      };
    });
  }, [currentMarketData]);

  const closeAllPositions = useCallback(() => {
    setState(prev => {
      let runBalance = prev.balance;
      const closedTrades = prev.positions.map(pos => {
        const finalPos = calculatePositionPnL(pos, currentMarketData);
        runBalance += finalPos.pnl;
        return {
          ...pos,
          closedAt: Date.now(),
          exitPrice: finalPos.currentPrice,
          realizedPnL: finalPos.pnl,
          pnlPercent: finalPos.pnlPercent
        };
      });

      return {
        ...prev,
        balance: runBalance,
        positions: [],
        history: [...closedTrades, ...prev.history],
      };
    });
  }, [currentMarketData]);

  const resetAccount = useCallback(() => {
    setState({
      balance: INITIAL_BALANCE,
      positions: [],
      history: [],
    });
  }, []);

  return {
    state,
    livePositions,
    analytics,
    placeOrder,
    closePosition,
    closeAllPositions,
    resetAccount
  };
};

export const usePaperTradeConfig = () => {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('TRADO_PAPER_ENABLED') === 'true');
  const toggleEnabled = (val) => {
    const next = val !== undefined ? val : !enabled;
    localStorage.setItem('TRADO_PAPER_ENABLED', next.toString());
    setEnabled(next);
  };
  return { isPaperTradeEnabled: enabled, togglePaperTrade: toggleEnabled };
};

