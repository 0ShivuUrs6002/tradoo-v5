import { PenTool, Flame, Coins, Target } from 'lucide-react';

// ─── Signal Card ──────────────────────────────────────────────────────────────

const SignalCard = ({ icon: Icon, title, value, label, tone, sub, delay = 1 }) => (
  <div className={`kpi-card slide-up-${delay}`}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {Icon && <Icon size={16} className={`text-${tone || 'neutral'}`} strokeWidth={1.5} />}
      <div className="kpi-label" style={{ margin: 0, letterSpacing: 0.5 }}>{title}</div>
    </div>
    <div className={`kpi-value${tone ? ' ' + tone : ''}`}>{value}</div>
    {label && (
      <span className={`dir-badge ${tone || 'neutral'}`} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
        {label}
      </span>
    )}
    {sub && <div className="kpi-sub" style={{ marginTop: 6, opacity: 0.7 }}>{sub}</div>}
  </div>
);

// ─── Score Bar Row ────────────────────────────────────────────────────────────

const ScoreBar = ({ label, value, max = 1, tone }) => {
  const pct = Math.min(100, (Math.abs(value || 0) / max) * 100).toFixed(1);
  const barTone = tone || (value > 0 ? 'bullish' : value < 0 ? 'bearish' : 'neutral');
  return (
    <div className="signal-row">
      <span className="signal-name">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="strength-bar-track" style={{ width: 90 }}>
          <div className={`strength-bar-fill ${barTone}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="signal-value">{typeof value === 'number' ? value.toFixed(4) : value || '—'}</span>
      </div>
    </div>
  );
};

// ─── Signals Tab ──────────────────────────────────────────────────────────────

export const SignalsTab = ({ data }) => {
  const a = data?.analytics || {};
  const coh = data?.coherence || {};
  const pred = data?.prediction || {};

  const writerTone = a.writerRelation === 'BULLISH_WRITERS' ? 'bullish'
    : a.writerRelation === 'BEARISH_WRITERS' ? 'bearish' : 'neutral';

  const bsTone = a.buyerSeller === 'BUYER_DOMINANT' ? 'bullish'
    : a.buyerSeller === 'SELLER_DOMINANT' ? 'bearish' : 'neutral';

  const biosTone = a.biasScore > 0.1 ? 'bullish' : a.biasScore < -0.1 ? 'bearish' : 'neutral';
  const btScore = a.breakoutScore;
  const btTone = btScore > 0.2 ? 'bullish' : btScore < -0.2 ? 'bearish' : 'neutral';

  return (
    <div className="stack">
      {/* Top signal cards */}
      <div className="grid2">
        <SignalCard
          icon={PenTool} title="WRITER FLOW" delay={1}
          value={a.writer != null ? (a.writer > 0 ? '+' : '') + a.writer.toFixed(4) : '—'}
          label={a.writerRelation || 'BALANCED'}
          tone={writerTone}
          sub={`Put pressure vs Call pressure`}
        />
        <SignalCard
          icon={Flame} title="BREAKOUT SCORE" delay={2}
          value={btScore != null ? (btScore > 0 ? '+' : '') + btScore.toFixed(4) : '—'}
          label={btScore > 0.2 ? 'BREAKOUT LIKELY' : btScore < -0.2 ? 'BREAKDOWN RISK' : 'CONSOLIDATING'}
          tone={btTone}
          sub={`Momentum + Writer + Volume + Volatility`}
        />
        <SignalCard
          icon={Coins} title="BUYER / SELLER" delay={3}
          value={a.buyerSeller || '—'}
          tone={bsTone}
          sub={`Based on OI change & price direction`}
        />
        <SignalCard
          icon={Target} title="MARKET BIAS" delay={4}
          value={a.biasScore != null ? (a.biasScore > 0 ? '+' : '') + a.biasScore.toFixed(4) : '—'}
          label={a.biasScore > 0.1 ? 'BULLISH' : a.biasScore < -0.1 ? 'BEARISH' : 'NEUTRAL'}
          tone={biosTone}
          sub={`Momentum + VWAP + GEX + Writer`}
        />
      </div>

      {/* Coherence signal breakdown */}
      <div className="card slide-up-3">
        <div className="card-header">
          <div className="card-title">Coherence Signal Breakdown</div>
          <span className={`dir-badge ${coh.coherentDirection === 'BULLISH' ? 'bullish' : coh.coherentDirection === 'BEARISH' ? 'bearish' : 'neutral'}`}>
            {coh.coherentDirection || 'NEUTRAL'}
          </span>
        </div>
        <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          Dominant vector: <strong style={{ color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{coh.dominantSignal || '—'}</strong>
          &nbsp;·&nbsp; Total Score: <strong style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>{coh.coherenceScore?.toFixed(4) || '—'}</strong>
        </div>
        {coh.signalBreakdown && (
          <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
            <ScoreBar label="Price vs VWAP" value={coh.signalBreakdown.price} />
            <ScoreBar label="GEX Signal" value={coh.signalBreakdown.gex} />
            <ScoreBar label="Momentum" value={coh.signalBreakdown.momentum} />
            <ScoreBar label="Writer Flow" value={coh.signalBreakdown.flow} />
          </div>
        )}
      </div>

      {/* Analytics metrics */}
      <div className="card slide-up-4">
        <div className="card-header">
          <div className="card-title">Raw Analytics</div>
        </div>
        <div>
          <ScoreBar label="Volatility (σ)" value={a.volatility} max={200} tone="neutral" />
          <ScoreBar label="GEX (proxy)" value={a.gex} max={500000} />
          <ScoreBar label="Momentum (5m)" value={a.momentum} max={200} />
          <ScoreBar label="Prediction Score" value={pred.predictionScore} max={1} />
          <div className="signal-row">
            <span className="signal-name">Liquidity</span>
            <span className="signal-value">{a.liquidity ? a.liquidity.toLocaleString('en-IN') : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
