import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Large Score Display ──────────────────────────────────────────────────────

const ScoreDisplay = ({ score, direction, confidence, confidenceLabel }) => {
  const tone = direction === 'BULLISH' ? 'var(--green)' : direction === 'BEARISH' ? 'var(--red)' : 'var(--amber)';
  const pct = Math.round((confidence || 0) * 100);

  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Prediction Score
      </div>
      <div style={{ fontSize: 56, fontWeight: 800, fontFamily: 'var(--font-mono)', color: tone, lineHeight: 1 }}>
        {score != null ? (score > 0 ? '+' : '') + score.toFixed(3) : '—'}
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className={`dir-badge ${direction === 'BULLISH' ? 'bullish' : direction === 'BEARISH' ? 'bearish' : 'neutral'}`}
          style={{ fontSize: 14, padding: '8px 20px', letterSpacing: 0.5 }}>
          {direction === 'BULLISH' ? <TrendingUp size={16} /> : direction === 'BEARISH' ? <TrendingDown size={16} /> : <Minus size={16} />}
          <span>{direction || 'NEUTRAL'}</span>
        </span>
        <span className={`dir-badge ${confidenceLabel === 'HIGH' ? 'bullish' : confidenceLabel === 'MEDIUM' ? 'neutral' : 'neutral'}`}
          style={{ fontSize: 12, letterSpacing: 0.5 }}>
          {confidenceLabel || 'LOW'} CONFIDENCE · {pct}%
        </span>
      </div>
      {/* Confidence bar */}
      <div style={{ maxWidth: 260, margin: '16px auto 0' }}>
        <div className="strength-bar-track" style={{ height: 6, borderRadius: 3 }}>
          <div
            className={`strength-bar-fill ${direction === 'BULLISH' ? 'bullish' : direction === 'BEARISH' ? 'bearish' : 'neutral'}`}
            style={{ width: `${pct}%`, height: '100%', borderRadius: 3 }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Input Factor Row ─────────────────────────────────────────────────────────

const InputFactor = ({ label, value, weight }) => {
  const pct = Math.min(100, Math.abs(value || 0) * 100).toFixed(1);
  const tone = value > 0.05 ? 'bullish' : value < -0.05 ? 'bearish' : 'neutral';
  return (
    <div className="signal-row">
      <div>
        <div className="signal-name" style={{ marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{weight}% weight</div>
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

// ─── Prediction Tab ───────────────────────────────────────────────────────────

export const PredictionTab = ({ data }) => {
  const pred = data?.prediction || {};
  const coh = data?.coherence || {};
  const stab = data?.stability || {};
  const a = data?.analytics || {};
  const inputs = pred.inputs || {};

  return (
    <div className="stack">
      {/* Main prediction display */}
      <div className="card slide-up-1">
        <ScoreDisplay
          score={pred.predictionScore}
          direction={pred.direction}
          confidence={pred.confidence}
          confidenceLabel={pred.confidenceLabel}
        />
      </div>

      {/* Two column: Coherence + Stability */}
      <div className="grid2">
        <div className="card slide-up-2">
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
            <span className="signal-name">Bias Score</span>
            <span className="signal-value">{a.biasScore?.toFixed(4) ?? '—'}</span>
          </div>
          <div className="signal-row">
            <span className="signal-name">Writer Relation</span>
            <span className="signal-value" style={{ fontSize: 11 }}>{a.writerRelation || '—'}</span>
          </div>
        </div>

        <div className="card slide-up-3">
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

      {/* Input breakdown */}
      <div className="card slide-up-4">
        <div className="card-header">
          <div className="card-title">Prediction Input Factors</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Normalized [-1, +1]</div>
        </div>
        <InputFactor label="Market Bias" value={inputs.bias} weight={25} />
        <InputFactor label="Momentum (5m)" value={inputs.momentum} weight={20} />
        <InputFactor label="GEX Signal" value={inputs.gex} weight={20} />
        <InputFactor label="Liquidity" value={inputs.liquidity} weight={15} />
        <InputFactor label="Volatility" value={inputs.volatility} weight={10} />
        <InputFactor label="VWAP Deviation" value={inputs.vwapDeviation} weight={10} />
      </div>
    </div>
  );
};
