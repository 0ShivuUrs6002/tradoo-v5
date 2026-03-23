import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { ResponsiveContainer, AreaChart, Area, Tooltip, YAxis } from 'recharts';

// ─── Sparkline Chart ──────────────────────────────────────────────────────────

const SparklineTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)',
        padding: '4px 8px', borderRadius: '4px', boxShadow: 'var(--card-shadow)',
        fontSize: '11px', fontWeight: '700', fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)'
      }}>
        {payload[0].value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </div>
    );
  }
  return null;
};

const Sparkline = ({ candles = [], spot = 0 }) => {
  const data = useMemo(() => {
    const closes = candles.map((c) => ({ price: c.c })).filter((v) => v.price > 0);
    if (!closes.length) return null;
    const min = Math.min(...closes.map(c => c.price));
    const max = Math.max(...closes.map(c => c.price));
    const first = closes[0].price;
    const last = closes[closes.length - 1].price;
    const trend = last >= first ? 'up' : 'down';
    return { points: closes, min, max, trend, last };
  }, [candles]);

  if (!data) return <div className="chart-empty">No chart data yet</div>;

  const color = data.trend === 'up' ? '#22c55e' : '#ef4444';
  const yMin = data.min - (data.max - data.min) * 0.05;
  const yMax = data.max + (data.max - data.min) * 0.05;

  return (
    <div className="chart-wrap" style={{ height: 160, marginTop: 16 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.points} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip 
            content={<SparklineTooltip />}
            cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <YAxis domain={[yMin, yMax]} hide />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#sparkGrad)"
            isAnimationActive={true}
            activeDot={{ r: 4, fill: 'var(--bg-surface)', stroke: color, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span>Low {data.min.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        <span>High {data.max.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
};

// ─── SR Bar ───────────────────────────────────────────────────────────────────

const SRBar = ({ label, strike, score, tone }) => {
  const pct = Math.min(100, Math.abs(score || 0) * 100).toFixed(0);
  const isUp = tone === 'bullish';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {strike ? strike.toLocaleString('en-IN') : '—'}
        </span>
      </div>
      <div className="strength-bar-track">
        <div
          className={`strength-bar-fill ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, fontSize: 11, color: isUp ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
        Strength {pct}% {isUp ? <span className="arrow-up" style={{ fontSize: '0.8em' }}>▲</span> : <span className="arrow-down" style={{ fontSize: '0.8em' }}>▼</span>}
      </div>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const Kpi = ({ label, value, sub, tone, delay = 0, isArrowValue }) => {
  const isUp = tone === 'bullish';
  const isDown = tone === 'bearish';
  
  return (
    <div className={`kpi-card slide-up-${delay + 1}`}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value${tone ? ' ' + tone : ''}`} style={isArrowValue ? { display: 'flex', alignItems: 'center', gap: '6px' } : {}}>
        {isArrowValue && isUp ? <span className="arrow-up" style={{ fontSize: '0.8em' }}>▲</span> : isArrowValue && isDown ? <span className="arrow-down" style={{ fontSize: '0.8em' }}>▼</span> : null}
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
};

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

export const DashboardTab = ({ data }) => {
  const a = data?.analytics || {};
  const pred = data?.prediction || {};
  const coh = data?.coherence || {};
  const ind = data?.indicators || {};
  const tfs = pred?.timeframes || {};

  const spotFmt = a.spot ? a.spot.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
  const futureFmt = a.futures ? a.futures.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
  const vwapFmt = a.vwap ? a.vwap.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';

  // Make momentum a percentage strength instead of raw decimal points
  const momTone = a.momentum > 0 ? 'bullish' : a.momentum < 0 ? 'bearish' : '';
  const momStr = a.momentum != null ? `${Math.min(100, Math.abs(a.momentum * 100)).toFixed(0)}%` : '—';

  // Bias Score to percentage
  const biasTone = a.biasScore > 0 ? 'bullish' : a.biasScore < 0 ? 'bearish' : '';
  const biasStr = a.biasScore != null ? `${Math.min(100, Math.abs(a.biasScore)).toFixed(0)}%` : '—';

  // GEX format to directional
  const gexTone = a.gex > 0 ? 'bullish' : a.gex < 0 ? 'bearish' : '';
  const gexStr = a.gex != null ? (a.gex > 0 ? 'Net Long' : 'Net Short') : '—';

  const dirLabel = coh.coherentDirection || '—';
  const dirTone = dirLabel === 'BULLISH' ? 'bullish' : dirLabel === 'BEARISH' ? 'bearish' : '';

  const rsiVal = ind.rsi;
  const rsiTone = rsiVal >= 70 ? 'bearish' : rsiVal <= 30 ? 'bullish' : '';
  const pcrVal = ind.pcr || a.pcr;
  const pcrTone = pcrVal > 1.2 ? 'bullish' : pcrVal < 0.8 ? 'bearish' : '';

  return (
    <div className="stack">
      {/* Live Chart — TOP of dashboard */}
      <div className="card card-full slide-up-1">
        <div className="card-header">
          <div className="card-title">Live Spot Chart</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {data?.candles?.length || 0} candles
          </div>
        </div>
        <Sparkline candles={data?.candles || []} spot={a.spot} />
      </div>

      {/* KPI row */}
      <div className="grid2">
        <Kpi label="Spot Price" value={spotFmt} delay={0} />
        <Kpi label="Futures" value={futureFmt} delay={1} />
        <Kpi label="VWAP" value={vwapFmt} delay={2} />
        <Kpi label="Momentum (5m)" value={momStr} tone={momTone} isArrowValue={true} delay={3} />
        <Kpi label="RSI-14" value={rsiVal != null ? rsiVal.toFixed(1) : '—'} tone={rsiTone} delay={4}
          sub={rsiVal >= 70 ? 'Overbought' : rsiVal <= 30 ? 'Oversold' : 'Neutral'} />
        <Kpi label="PCR" value={pcrVal != null ? pcrVal.toFixed(3) : '—'} tone={pcrTone} delay={5}
          sub={pcrVal > 1.2 ? 'Put heavy' : pcrVal < 0.8 ? 'Call heavy' : 'Balanced'} />
        <Kpi label="Bias Score" value={biasStr} tone={biasTone} isArrowValue={true} delay={6} />
        <Kpi label="Net GEX" value={gexStr} tone={gexTone} isArrowValue={true} delay={7} />
      </div>

      {/* Market Direction Row */}
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(300px, 1fr) 2fr' }}>
        <div className="card slide-up-4">
          <div className="card-header">
            <div className="card-title">Market Direction</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.5 }}>COHERENT DIRECTION</div>
              <span className={`dir-badge ${dirTone || 'neutral'}`}>
                {dirTone === 'bullish' ? <span className="arrow-up">▲</span> : dirTone === 'bearish' ? <span className="arrow-down">▼</span> : <Minus size={14} />}
                <span>{dirLabel}</span>
              </span>
            </div>
            
            <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 0.5 }}>MULTI-TIMEFRAME PREDICTIONS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: '15 Min', data: tfs.m15 },
                  { label: '30 Min', data: tfs.m30 },
                  { label: '1 Hour', data: tfs.h1 }
                ].map(({ label, data }) => (
                  <div key={label} style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: data?.direction === 'BULLISH' ? 'var(--green)' : data?.direction === 'BEARISH' ? 'var(--red)' : 'var(--text-primary)' }}>
                      {data?.direction === 'BULLISH' ? <span className="arrow-up">▲</span> : data?.direction === 'BEARISH' ? <span className="arrow-down">▼</span> : ''}
                      {data?.probability ? Math.round(data.probability) : 50}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 0.5 }}>OVERALL PROBABILITY</div>
                <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700, color: pred.direction === 'BULLISH' ? 'var(--green)' : pred.direction === 'BEARISH' ? 'var(--red)' : 'var(--text-primary)' }}>
                  {pred.probability != null ? `${Math.round(pred.probability)}%` : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 0.5 }}>WRITER FLOW</div>
                <span className={`dir-badge ${a.writerRelation === 'BULLISH_WRITERS' ? 'bullish' : a.writerRelation === 'BEARISH_WRITERS' ? 'bearish' : 'neutral'}`}>
                  <span>{a.writerRelation || 'BALANCED'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Support / Resistance */}
        <div className="card slide-up-5">
          <div className="card-header">
            <div className="card-title">Support / Resistance Walls</div>
          </div>
          <div className="stack" style={{ gap: 14 }}>
            <SRBar
              label="Strongest Support (Puts)"
              strike={a.support?.strike}
              score={a.support?.supportScore}
              tone="bullish"
            />
            <SRBar
              label="Strongest Resistance (Calls)"
              strike={a.resistance?.strike}
              score={a.resistance?.resistanceScore}
              tone="bearish"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
