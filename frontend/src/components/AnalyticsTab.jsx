// ─── Bias Gauge (SVG arc) ─────────────────────────────────────────────────────

const BiasGauge = ({ value = 0 }) => {
  // value: -1 to +1
  const clamped = Math.max(-1, Math.min(1, value));
  const r = 70;
  const cx = 90;
  const cy = 88;
  const startAngle = -180;
  const endAngle = 0;
  // Map clamped (-1 to +1) to angle (-180 to 0)
  const needleAngle = startAngle + ((clamped + 1) / 2) * (endAngle - startAngle);
  const needleRad = (needleAngle * Math.PI) / 180;
  const nx = cx + r * Math.cos(needleRad);
  const ny = cy + r * Math.sin(needleRad);

  const arcPath = (start, end, color) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2}`;
  };

  const tone = clamped > 0.1 ? 'var(--green)' : clamped < -0.1 ? 'var(--red)' : 'var(--amber)';

  return (
    <div className="gauge-wrap">
      <svg width="180" height="100" style={{ overflow: 'visible' }}>
        {/* Background arc */}
        <path d={arcPath(-180, 0, '')} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {/* Bearish zone */}
        <path d={arcPath(-180, -90, '')} fill="none" stroke="rgba(248,113,113,0.3)" strokeWidth="10" />
        {/* Neutral zone */}
        <path d={arcPath(-90, -90, '')} fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="10" />
        {/* Bullish zone */}
        <path d={arcPath(-90, 0, '')} fill="none" stroke="rgba(34,197,94,0.3)" strokeWidth="10" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={tone} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={tone} />
        {/* Labels */}
        <text x={cx - r - 8} y={cy + 12} fontSize="9" fill="var(--red)" textAnchor="end">BEAR</text>
        <text x={cx + r + 8} y={cy + 12} fontSize="9" fill="var(--green)" textAnchor="start">BULL</text>
        {/* Value */}
        <text x={cx} y={cy + 28} fontSize="15" fontWeight="700" fontFamily="JetBrains Mono, monospace" fill={tone} textAnchor="middle">
          {(clamped > 0 ? '+' : '') + clamped.toFixed(3)}
        </text>
      </svg>
    </div>
  );
};

// ─── Analytics Row ────────────────────────────────────────────────────────────

const ARow = ({ label, value, mono = true, color }) => (
  <div className="signal-row">
    <span className="signal-name">{label}</span>
    <span className="signal-value" style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, color }}>
      {value ?? '—'}
    </span>
  </div>
);

// ─── Analytics Tab ────────────────────────────────────────────────────────────

export const AnalyticsTab = ({ data }) => {
  const a = data?.analytics || {};

  const gexColor = a.gex > 0 ? 'var(--green)' : a.gex < 0 ? 'var(--red)' : undefined;
  const momColor = a.momentum > 0 ? 'var(--green)' : a.momentum < 0 ? 'var(--red)' : undefined;

  return (
    <div className="stack">
      {/* Bias Gauge + key values */}
      <div className="grid2">
        <div className="card slide-up-1" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="card-title">Market Bias Gauge</div>
            <span className={`dir-badge ${a.biasScore > 0.1 ? 'bullish' : a.biasScore < -0.1 ? 'bearish' : 'neutral'}`}>
              {a.biasScore > 0.1 ? 'BULLISH BIAS' : a.biasScore < -0.1 ? 'BEARISH BIAS' : 'NEUTRAL'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <BiasGauge value={a.biasScore} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
            {[
              { label: 'Momentum', pct: 30 },
              { label: 'VWAP Dev', pct: 25 },
              { label: 'GEX', pct: 25 },
              { label: 'Writer', pct: 20 },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</div>
                <div style={{ color: 'var(--text-muted)' }}>{item.pct}% weight</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid2">
        <div className="card slide-up-2">
          <div className="card-header"><div className="card-title">Price & Volume</div></div>
          <ARow label="Spot Price" value={a.spot?.toLocaleString('en-IN', { maximumFractionDigits: 2 })} />
          <ARow label="Futures" value={a.futures?.toLocaleString('en-IN', { maximumFractionDigits: 2 })} />
          <ARow label="VWAP" value={a.vwap?.toLocaleString('en-IN', { maximumFractionDigits: 2 })} />
          <ARow label="Liquidity" value={a.liquidity?.toLocaleString('en-IN')} />
        </div>

        <div className="card slide-up-3">
          <div className="card-header"><div className="card-title">Momentum & Volatility</div></div>
          <ARow
            label="Momentum (5m)" mono
            value={a.momentum != null ? (a.momentum > 0 ? '+' : '') + a.momentum.toFixed(2) : null}
            color={momColor}
          />
          <ARow
            label="Short Momentum"
            value={a.shortMomentum != null ? (a.shortMomentum > 0 ? '+' : '') + a.shortMomentum.toFixed(2) : null}
            color={a.shortMomentum > 0 ? 'var(--green)' : a.shortMomentum < 0 ? 'var(--red)' : undefined}
          />
          <ARow label="Volatility (σ)" value={a.volatility?.toFixed(2)} />
          <ARow
            label="GEX (proxy)" mono
            value={a.gex != null ? a.gex.toLocaleString('en-IN') : null}
            color={gexColor}
          />
        </div>

        <div className="card slide-up-4">
          <div className="card-header"><div className="card-title">Writer & Flow</div></div>
          <ARow label="Writer Signal" value={a.writer?.toFixed(4)} />
          <ARow label="Writer Relation" mono={false}
            value={a.writerRelation}
            color={a.writerRelation === 'BULLISH_WRITERS' ? 'var(--green)' : a.writerRelation === 'BEARISH_WRITERS' ? 'var(--red)' : 'var(--amber)'}
          />
          <ARow label="Buyer/Seller" mono={false}
            value={a.buyerSeller}
            color={a.buyerSeller === 'BUYER_DOMINANT' ? 'var(--green)' : a.buyerSeller === 'SELLER_DOMINANT' ? 'var(--red)' : 'var(--amber)'}
          />
          <ARow label="Breakout Score" value={a.breakoutScore?.toFixed(4)} />
        </div>

        <div className="card slide-up-5">
          <div className="card-header"><div className="card-title">Support / Resistance</div></div>
          <ARow label="Support Strike" value={a.support?.strike?.toLocaleString('en-IN')} />
          <ARow label="S Strength" value={a.support?.supportScore?.toFixed(3)} />
          <ARow label="Resistance Strike" value={a.resistance?.strike?.toLocaleString('en-IN')} />
          <ARow label="R Strength" value={a.resistance?.resistanceScore?.toFixed(3)} />
        </div>
      </div>
    </div>
  );
};
