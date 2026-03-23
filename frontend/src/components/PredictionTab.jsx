import { TrendingUp, TrendingDown, Minus, ShieldAlert, Sun, Sunrise } from 'lucide-react';

// ─── Large Score Display ──────────────────────────────────────────────────────

const ScoreDisplay = ({ probability, direction, agreement }) => {
  const tone = direction === 'BULLISH' ? 'var(--green)' : direction === 'BEARISH' ? 'var(--red)' : 'var(--amber)';
  const agr = agreement || {};

  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Overall Probability
      </div>
      <div style={{ fontSize: 56, fontWeight: 800, fontFamily: 'var(--font-mono)', color: tone, lineHeight: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        {direction === 'BULLISH' ? <div className="arrow-up" style={{ fontSize: 40 }}>▲</div> : direction === 'BEARISH' ? <div className="arrow-down" style={{ fontSize: 40 }}>▼</div> : null}
        {probability != null ? `${Math.round(probability)}%` : '—'}
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className={`dir-badge ${direction === 'BULLISH' ? 'bullish' : direction === 'BEARISH' ? 'bearish' : 'neutral'}`}
          style={{ fontSize: 14, padding: '8px 20px', letterSpacing: 0.5 }}>
          <span>{direction || 'NEUTRAL'}</span>
        </span>
      </div>
      {/* Agreement indicator */}
      {agr.total > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{agr.bullish}</span> bullish
          <span style={{ margin: '0 6px' }}>·</span>
          <span style={{ color: 'var(--red)', fontWeight: 600 }}>{agr.bearish}</span> bearish
          <span style={{ margin: '0 6px' }}>·</span>
          out of {agr.total} indicators
        </div>
      )}
      {/* Confidence bar */}
      <div style={{ maxWidth: 260, margin: '16px auto 0' }}>
        <div className="strength-bar-track" style={{ height: 6, borderRadius: 3 }}>
          <div
            className={`strength-bar-fill ${direction === 'BULLISH' ? 'bullish' : direction === 'BEARISH' ? 'bearish' : 'neutral'}`}
            style={{ width: `${probability || 50}%`, height: '100%', borderRadius: 3 }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Signal Row ───────────────────────────────────────────────────────────────

const SignalRow = ({ label, value, weight }) => {
  const pct = Math.min(100, Math.abs(value || 0) * 100).toFixed(1);
  const tone = value > 0.05 ? 'bullish' : value < -0.05 ? 'bearish' : 'neutral';
  return (
    <div className="signal-row">
      <div>
        <div className="signal-name" style={{ marginBottom: 2 }}>{label}</div>
        {weight != null && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{weight}% weight</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="strength-bar-track" style={{ width: 80 }}>
          <div className={`strength-bar-fill ${tone}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="signal-value" style={{ color: value > 0 ? 'var(--green)' : value < 0 ? 'var(--red)' : undefined }}>
          {value != null ? (value > 0 ? '+' : '') + value.toFixed(4) : '—'}
        </span>
      </div>
    </div>
  );
};

const TimeframeCard = ({ title, data, delay }) => {
  const prob = data?.probability || 50;
  const dir = data?.direction || 'FLAT';
  const tone = dir === 'BULLISH' ? 'bullish' : dir === 'BEARISH' ? 'bearish' : 'neutral';
  
  return (
    <div className={`card slide-up-${delay}`} style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {title} Forecast
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: `var(--${tone === 'neutral' ? 'amber' : tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {dir === 'BULLISH' ? <span className="arrow-up" style={{ fontSize: 24 }}>▲</span> : dir === 'BEARISH' ? <span className="arrow-down" style={{ fontSize: 24 }}>▼</span> : null}
        {Math.round(prob)}%
      </div>
      <div style={{ marginTop: 12 }}>
        <span className={`dir-badge ${tone}`}>
          {dir}
        </span>
      </div>
    </div>
  );
};

// ─── Prediction Tab ───────────────────────────────────────────────────────────

export const PredictionTab = ({ data }) => {
  const pred = data?.prediction || {};
  const coh = data?.coherence || {};
  const stab = data?.stability || {};
  const tfs = pred.timeframes || {};
  const rev = data?.reversal || {};
  const gap = data?.gap || {};
  const signals = pred.signals || {};
  const agreement = pred.agreement || {};

  return (
    <div className="stack">
      {/* Main prediction display */}
      <div className="card slide-up-1">
        <ScoreDisplay
          probability={pred.probability}
          direction={pred.direction}
          agreement={agreement}
        />
      </div>

      {/* ─── Premium God-Level Engine Row ─── */}
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: 16 }}>
        {/* Reversal Engine */}
        <div className="card slide-up-2" style={{ borderColor: rev.isMajorReversal ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          {rev.isMajorReversal && <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'var(--red)' }} />}
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={16} color={rev.isMajorReversal ? 'var(--red)' : 'var(--text-muted)'} />
              Reversal Engine
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: rev.probability > 0.5 ? 'var(--red)' : 'var(--green)' }}>
              {Math.round(rev.probability * 100)}%
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Probability of an imminent major trend reversal.
          </div>
          {rev.warnings && rev.warnings.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rev.warnings.map(w => (
                <div key={w} style={{ fontSize: 11, padding: '4px 8px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠️ {w}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gap Predictor Engine */}
        <div className="card slide-up-3">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sunrise size={16} color="var(--amber)" />
              Next-Day Gap Predictor
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              {gap.direction === 'GAP_UP' ? <span className="arrow-up">▲</span> : gap.direction === 'GAP_DOWN' ? <span className="arrow-down">▼</span> : <Minus size={14} />}
              <span style={{ color: gap.direction === 'GAP_UP' ? 'var(--green)' : gap.direction === 'GAP_DOWN' ? 'var(--red)' : 'var(--text-primary)' }}>
                {Math.round(gap.probability * 100)}%
              </span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            EOD prediction for 9:15 AM opening gap direction.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {gap.signals?.map(sig => (
              <span key={sig.name} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                {sig.name}: {sig.value > 0 ? '+' : ''}{sig.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Timeframe Displays */}
      <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <TimeframeCard title="15 Minute" data={tfs.m15} delay={4} />
        <TimeframeCard title="30 Minute" data={tfs.m30} delay={5} />
        <TimeframeCard title="1 Hour" data={tfs.h1} delay={6} />
      </div>

      <div className="grid2">
        {/* Trend & Momentum */}
        <div className="card slide-up-4">
          <div className="card-header">
            <div className="card-title">Trend & Momentum</div>
          </div>
          <SignalRow label="EMA Crossover (9/21)" value={signals.emaCross} />
          <SignalRow label="RSI Relative Score" value={signals.rsi} />
          <SignalRow label="MACD Histogram" value={signals.macd} />
          <SignalRow label="Volume Surge" value={signals.volumeSurge} />
          <SignalRow label="Price Momentum" value={signals.momentum} />
        </div>

        {/* Option Flow */}
        <div className="card slide-up-5">
          <div className="card-header">
            <div className="card-title">Institutional Flow</div>
          </div>
          <SignalRow label="Put-Call Ratio Signal" value={signals.pcr} />
          <SignalRow label="Writer Domination" value={signals.writer} />
          <SignalRow label="IV Skew (Fear Gauge)" value={signals.ivSkew} />
          <SignalRow label="Gamma Exposure (GEX)" value={signals.gex} />
          <SignalRow label="OI Concentration" value={signals.oiConcentration} />
        </div>
      </div>

      {/* Coherence + Stability */}
      <div className="grid2">
        <div className="card slide-up-6">
          <div className="card-header">
            <div className="card-title">Coherence Engine</div>
            <span className={`dir-badge ${coh.coherentDirection === 'BULLISH' ? 'bullish' : coh.coherentDirection === 'BEARISH' ? 'bearish' : 'neutral'}`}>
              {coh.coherentDirection || 'NEUTRAL'}
            </span>
          </div>
          <div className="signal-row">
            <span className="signal-name">Coherence Score</span>
            <span className="signal-value" style={{ fontFamily: 'var(--font-mono)', color: coh.coherenceScore > 0 ? 'var(--green)' : coh.coherenceScore < 0 ? 'var(--red)' : undefined }}>
              {coh.coherenceScore != null ? (coh.coherenceScore > 0 ? '+' : '') + coh.coherenceScore.toFixed(4) : '—'}
            </span>
          </div>
          <div className="signal-row">
            <span className="signal-name">Dominant Signal</span>
            <span className="signal-value" style={{ textTransform: 'uppercase' }}>{coh.dominantSignal || '—'}</span>
          </div>
          <div className="signal-row">
            <span className="signal-name">Coherence Quality</span>
            <span className="signal-value">{coh.coherenceQuality != null ? (coh.coherenceQuality * 100).toFixed(0) + '%' : '—'}</span>
          </div>
        </div>

        <div className="card slide-up-7">
          <div className="card-header">
            <div className="card-title">Stability Engine</div>
          </div>
          <div className="signal-row">
            <span className="signal-name">Confirmed Cycles</span>
            <span className="signal-value">{stab.confirmedCycles ?? '—'}</span>
          </div>
          <div className="signal-row">
            <span className="signal-name">Pending Cycles</span>
            <span className="signal-value">{stab.pendingCycles ?? '—'} / 3</span>
          </div>
          <div className="signal-row">
            <span className="signal-name">UI Updated</span>
            <span className="signal-value" style={{ color: stab.updated ? 'var(--green)' : 'var(--text-muted)' }}>
              {stab.updated ? 'Yes' : 'Frozen'}
            </span>
          </div>
          <div className="signal-row">
            <span className="signal-name">Total Snapshots</span>
            <span className="signal-value">{data?.meta?.snapshots ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
