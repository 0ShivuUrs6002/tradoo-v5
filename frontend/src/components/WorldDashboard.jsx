import { useState, useMemo, useId } from 'react';
import { useWorld } from './WorldProvider';

import { ResponsiveContainer, AreaChart, Area, Tooltip, YAxis } from 'recharts';

// ─── Groww-Style Interactive Price Chart ──────────────────────────────────────────

const CustomTooltip = ({ active, payload, currency }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const fmtLbl = currency === '₹'
      ? `${currency}${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
      : `${currency}${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
      
    return (
      <div style={{
        background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)',
        padding: '6px 12px', borderRadius: '8px', boxShadow: 'var(--card-shadow)',
        fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)'
      }}>
        {fmtLbl}
      </div>
    );
  }
  return null;
};

const PriceChart = ({ chartData = [], color = '#FFD700', onPeriodChange, activePeriod, currency = '$' }) => {
  const uid = useId();
  const gradId = `chartGrad${uid.replace(/:/g, '')}`;

  const data = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;
    const prices = chartData.filter(p => p.price > 0);
    const min = Math.min(...prices.map(p => p.price));
    const max = Math.max(...prices.map(p => p.price));
    return { points: prices, min, max };
  }, [chartData]);

  if (!data) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading chart data...</div>;

  const periods = [
    { key: '1D', label: '1D', days: 1 },
    { key: '1W', label: '1W', days: 7 },
    { key: '1M', label: '1M', days: 30 },
    { key: '3M', label: '3M', days: 90 }
  ];

  const fmtLbl = (v) => currency === '₹'
    ? `${currency}${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : `${currency}${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  // Provide a tiny buffer so lines don't hit the absolute top/bottom
  const yMin = data.min - (data.max - data.min) * 0.05;
  const yMax = data.max + (data.max - data.min) * 0.05;

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.points} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={<CustomTooltip currency={currency} />}
              cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
              animationDuration={150}
            />
            <YAxis domain={[yMin, yMax]} hide />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradId})`}
              isAnimationActive={true}
              animationDuration={500}
              activeDot={{ r: 4, fill: 'var(--bg-surface)', stroke: color, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Period selector row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        {periods.map(p => (
          <button key={p.key}
            onClick={() => onPeriodChange && onPeriodChange(p.days)}
            style={{
              padding: '6px 16px', border: activePeriod === p.days ? `1px solid ${color}` : '1px solid var(--border-color)',
              borderRadius: 20, background: activePeriod === p.days ? `${color}15` : 'transparent',
              color: activePeriod === p.days ? color : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-mono)',
              transition: 'all 0.2s'
            }}
          >{p.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span>Low {fmtLbl(data.min)}</span>
        <span>High {fmtLbl(data.max)}</span>
      </div>
    </div>
  );
};

// ─── Stat Row ─────────────────────────────────────────────────────────────────
const StatRow = ({ label, value, tone }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: tone === 'bullish' ? 'var(--green)' : tone === 'bearish' ? 'var(--red)' : 'var(--text-primary)' }}>
      {value}
    </span>
  </div>
);

// ─── Performance Card ─────────────────────────────────────────────────────────
const ChangeTag = ({ label, value }) => {
  const tone = value > 0 ? 'bullish' : value < 0 ? 'bearish' : '';
  const arrow = value > 0 ? '\u25b2' : value < 0 ? '\u25bc' : '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, padding: '12px 0' }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{
        fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)',
        color: tone === 'bullish' ? 'var(--green)' : tone === 'bearish' ? 'var(--red)' : 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: 3
      }}>
        {arrow && <span className={tone === 'bullish' ? 'arrow-up' : 'arrow-down'} style={{ fontSize: 10 }}>{arrow}</span>}
        {value != null ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : '\u2014'}
      </span>
    </div>
  );
};

// Timeframe Mini Card
const TFCard = ({ title, data }) => {
  const prob = data?.probability || 50;
  const dir = data?.direction || 'FLAT';
  const color = dir === 'BULLISH' ? 'var(--green)' : dir === 'BEARISH' ? 'var(--red)' : 'var(--amber)';
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '16px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {dir === 'BULLISH' ? <span className="arrow-up" style={{ fontSize: 16 }}>{'\u25b2'}</span> : dir === 'BEARISH' ? <span className="arrow-down" style={{ fontSize: 16 }}>{'\u25bc'}</span> : null}
        {Math.round(prob)}%
      </div>
      <div style={{ marginTop: 8 }}><span className={`dir-badge ${dir === 'BULLISH' ? 'bullish' : dir === 'BEARISH' ? 'bearish' : 'neutral'}`} style={{ fontSize: 10 }}>{dir}</span></div>
    </div>
  );
};

const fmtNum = (n, dec = 2) => n != null ? n.toLocaleString('en-IN', { maximumFractionDigits: dec }) : '\u2014';
const fmtNumUS = (n, dec = 2) => n != null ? n.toLocaleString('en-US', { maximumFractionDigits: dec }) : '\u2014';
const fmtPrice = (n, cur = '$') => n != null ? `${cur}${cur === '\u20b9' ? fmtNum(n) : fmtNumUS(n)}` : '\u2014';
const fmtSupply = (n) => { if (!n) return '\u2014'; if (n >= 1e9) return `${(n/1e9).toFixed(2)}B`; if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`; return fmtNumUS(n, 0); };

// ─── Main World Dashboard ─────────────────────────────────────────────────────

export const WorldDashboard = ({ data, worldType, onPeriodChange, activePeriod }) => {
  const { currentAsset } = useWorld();
  const d = data || {};
  const pred = d.prediction || {};
  const tfs = pred.timeframes || {};
  const chartData = d.chartData || [];
  const isCrypto = worldType === 'crypto';
  const cur = d.currency || (isCrypto ? '$' : '₹');

  // Compute the actual accent color from CSS variable (SVG gradients can't use var())
  const accentColor = useMemo(() => {
    try {
      const val = getComputedStyle(document.documentElement).getPropertyValue('--world-accent').trim();
      return val || '#FFD700';
    } catch { return '#FFD700'; }
  }, [currentAsset]);

  const changePct = d.change24h != null ? `${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(2)}%` : '\u2014';
  const changeTone = d.change24h > 0 ? 'bullish' : d.change24h < 0 ? 'bearish' : '';
  const rsiTone = d.rsi >= 70 ? 'bearish' : d.rsi <= 30 ? 'bullish' : '';

  return (
    <div className="stack">
      {/* Price Header (Groww-style) */}
      <div className="card slide-up-1" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {d.name || currentAsset?.label || 'Asset'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {fmtPrice(d.spot, cur)}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: changeTone === 'bullish' ? 'var(--green)' : changeTone === 'bearish' ? 'var(--red)' : 'var(--text-muted)' }}>
              {changePct}
            </span>
          </div>
        </div>
        <div style={{ padding: '16px 12px 20px' }}>
          <PriceChart chartData={chartData} color={accentColor} onPeriodChange={onPeriodChange} activePeriod={activePeriod || 1} currency={cur} />
        </div>
      </div>

      {/* Performance Strip */}
      <div className="card slide-up-2" style={{ padding: '4px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {isCrypto ? (
            <>
              <ChangeTag label="1H" value={d.change1h} />
              <ChangeTag label="24H" value={d.change24h} />
              <ChangeTag label="7D" value={d.change7d} />
              <ChangeTag label="30D" value={d.change30d} />
            </>
          ) : (
            <>
              <ChangeTag label="24H" value={d.change24h} />
              <ChangeTag label="Bias" value={d.biasScore} />
            </>
          )}
        </div>
      </div>

      {/* Overall Prediction */}
      <div className="card slide-up-3" style={{ textAlign: 'center', padding: '28px 24px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Overall Probability
        </div>
        <div style={{
          fontSize: 48, fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1,
          color: pred.direction === 'BULLISH' ? 'var(--green)' : pred.direction === 'BEARISH' ? 'var(--red)' : 'var(--world-accent, var(--amber))',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10
        }}>
          {pred.direction === 'BULLISH' ? <span className="arrow-up" style={{ fontSize: 32 }}>{'\u25b2'}</span>
           : pred.direction === 'BEARISH' ? <span className="arrow-down" style={{ fontSize: 32 }}>{'\u25bc'}</span> : null}
          {pred.probability != null ? `${Math.round(pred.probability)}%` : '\u2014'}
        </div>
        <span className={`dir-badge ${pred.direction === 'BULLISH' ? 'bullish' : pred.direction === 'BEARISH' ? 'bearish' : 'neutral'}`}
          style={{ marginTop: 14, display: 'inline-flex', fontSize: 12, padding: '6px 18px' }}>
          {pred.direction || 'NEUTRAL'}
        </span>
      </div>

      {/* Multi-Timeframe */}
      <div style={{ display: 'flex', gap: 12 }}>
        <TFCard title="15 Min" data={tfs.m15} />
        <TFCard title="30 Min" data={tfs.m30} />
        <TFCard title="1 Hour" data={tfs.h1} />
      </div>

      {/* ── Reversal Alert ───────────────────────────────────────────────── */}
      {d.reversalSignal && d.reversalSignal.active && (
        <div className="card slide-up-3" style={{
          border: d.reversalSignal.type === 'BULLISH_REVERSAL'
            ? '1.5px solid var(--green)' : d.reversalSignal.type === 'BEARISH_REVERSAL'
            ? '1.5px solid var(--red)' : '1.5px solid var(--amber)',
          background: d.reversalSignal.type === 'BULLISH_REVERSAL'
            ? 'rgba(34,197,94,0.06)' : d.reversalSignal.type === 'BEARISH_REVERSAL'
            ? 'rgba(248,113,113,0.06)' : 'rgba(251,191,36,0.06)',
          padding: '20px 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: d.reversalSignal.type === 'BULLISH_REVERSAL' ? 'var(--green)' : d.reversalSignal.type === 'BEARISH_REVERSAL' ? 'var(--red)' : 'var(--amber)',
              boxShadow: `0 0 10px ${d.reversalSignal.type === 'BULLISH_REVERSAL' ? 'var(--green)' : d.reversalSignal.type === 'BEARISH_REVERSAL' ? 'var(--red)' : 'var(--amber)'}`,
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <span style={{
              fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
              color: d.reversalSignal.type === 'BULLISH_REVERSAL' ? 'var(--green)' : d.reversalSignal.type === 'BEARISH_REVERSAL' ? 'var(--red)' : 'var(--amber)'
            }}>
              Reversal Alert
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {d.reversalSignal.confidence}% Confidence
            </span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.5 }}>
            {d.reversalSignal.message}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {d.reversalSignal.triggers.map((t, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 12,
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)'
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Technical Analysis */}
      <div className="card slide-up-4">
        <div className="card-header">
          <div className="card-title">Technical Analysis</div>
        </div>
        <StatRow label="RSI (14)" value={fmtNumUS(d.rsi, 1)} tone={rsiTone} />
        <StatRow label="EMA 9" value={fmtPrice(d.ema9, cur)} />
        <StatRow label="EMA 21" value={fmtPrice(d.ema21, cur)} />
        {isCrypto && <StatRow label="SMA 50" value={fmtPrice(d.sma50, cur)} />}
        {isCrypto && <StatRow label="SMA 200" value={fmtPrice(d.sma200, cur)} />}
        <StatRow label="Support" value={fmtPrice(d.support, cur)} tone="bullish" />
        <StatRow label="Resistance" value={fmtPrice(d.resistance, cur)} tone="bearish" />
      </div>

      {/* Market Overview */}
      <div className="card slide-up-5">
        <div className="card-header">
          <div className="card-title">Market Overview</div>
        </div>
        <StatRow label="24h Volume" value={d.volume24h ? fmtSupply(d.volume24h) : '\u2014'} />
        <StatRow label="24h High" value={fmtPrice(d.high24h, cur)} />
        <StatRow label="24h Low" value={fmtPrice(d.low24h, cur)} />
      </div>
    </div>
  );
};
