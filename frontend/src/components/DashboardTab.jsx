import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Sparkline Chart ──────────────────────────────────────────────────────────

const Sparkline = ({ candles = [], spot = 0 }) => {
  const data = useMemo(() => {
    const closes = candles.map((c) => c.c).filter((v) => v > 0);
    if (!closes.length) return null;
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const points = closes.map((c, i) => {
      const x = (i / Math.max(closes.length - 1, 1)) * 100;
      const y = 100 - ((c - min) / range) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    const last = closes[closes.length - 1];
    const first = closes[0];
    const trend = last >= first ? 'up' : 'down';
    return { points, min, max, trend, last };
  }, [candles]);

  if (!data) return <div className="chart-empty">No chart data yet</div>;

  const color = data.trend === 'up' ? '#22c55e' : '#f87171';
  const areaPoints = `0,100 ${data.points} 100,100`;

  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <polygon fill="url(#sparkGrad)" points={areaPoints} />
        <polyline fill="none" stroke={color} strokeWidth="1.5" points={data.points} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>↓ {data.min.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        <span>↑ {data.max.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
};

// ─── SR Bar ───────────────────────────────────────────────────────────────────

const SRBar = ({ label, strike, score, tone }) => {
  const pct = Math.min(100, Math.abs(score || 0) * 100).toFixed(0);
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
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
        Strength {pct}%
      </div>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const Kpi = ({ label, value, sub, tone, delay = 0 }) => (
  <div className={`kpi-card slide-up-${delay + 1}`}>
    <div className="kpi-label">{label}</div>
    <div className={`kpi-value${tone ? ' ' + tone : ''}`}>{value}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

export const DashboardTab = ({ data }) => {
  const a = data?.analytics || {};
  const pred = data?.prediction || {};
  const coh = data?.coherence || {};

  const spotFmt = a.spot ? a.spot.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
  const futureFmt = a.futures ? a.futures.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
  const vwapFmt = a.vwap ? a.vwap.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';

  const momStr = a.momentum != null
    ? (a.momentum >= 0 ? '+' : '') + a.momentum.toFixed(2)
    : '—';
  const momTone = a.momentum > 0 ? 'bullish' : a.momentum < 0 ? 'bearish' : '';

  const dirLabel = coh.coherentDirection || '—';
  const dirTone = dirLabel === 'BULLISH' ? 'bullish' : dirLabel === 'BEARISH' ? 'bearish' : '';

  return (
    <div className="stack">
      {/* KPI row */}
      <div className="grid2">
        <Kpi label="Spot Price" value={spotFmt} delay={0} />
        <Kpi label="Futures" value={futureFmt} delay={1} />
        <Kpi label="VWAP" value={vwapFmt} delay={2} />
        <Kpi label="Momentum (5m)" value={momStr} tone={momTone} delay={3} />
        <Kpi label="Bias Score" value={a.biasScore != null ? a.biasScore.toFixed(3) : '—'} delay={4} />
        <Kpi label="GEX" value={a.gex != null ? a.gex.toLocaleString('en-IN') : '—'} delay={5} />
      </div>

      {/* S/R and Direction row */}
      <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card slide-up-3">
          <div className="card-header">
            <div className="card-title">Support / Resistance</div>
          </div>
          <div className="stack" style={{ gap: 14 }}>
            <SRBar
              label="Support"
              strike={a.support?.strike}
              score={a.support?.supportScore}
              tone="bullish"
            />
            <SRBar
              label="Resistance"
              strike={a.resistance?.strike}
              score={a.resistance?.resistanceScore}
              tone="bearish"
            />
          </div>
        </div>

        <div className="card slide-up-4">
          <div className="card-header">
            <div className="card-title">Market Direction</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.5 }}>COHERENT DIRECTION</div>
              <span className={`dir-badge ${dirTone || 'neutral'}`}>
                {dirTone === 'bullish' ? <TrendingUp size={14} /> : dirTone === 'bearish' ? <TrendingDown size={14} /> : <Minus size={14} />}
                <span>{dirLabel}</span>
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 0.5 }}>PREDICTION</div>
              <span className={`dir-badge ${pred.direction === 'BULLISH' ? 'bullish' : pred.direction === 'BEARISH' ? 'bearish' : 'neutral'}`}>
                <span>{pred.direction || 'NEUTRAL'}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{pred.confidenceLabel || '—'}</span>
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 0.5 }}>WRITER FLOW</div>
              <span className={`dir-badge ${a.writerRelation === 'BULLISH_WRITERS' ? 'bullish' : a.writerRelation === 'BEARISH_WRITERS' ? 'bearish' : 'neutral'}`}>
                <span>{a.writerRelation || 'BALANCED'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Chart */}
      <div className="card card-full slide-up-5">
        <div className="card-header">
          <div className="card-title">Live Spot Chart</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {data?.candles?.length || 0} candles
          </div>
        </div>
        <Sparkline candles={data?.candles || []} spot={a.spot} />
      </div>
    </div>
  );
};
