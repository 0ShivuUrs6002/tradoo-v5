import { useMemo } from 'react';
import { LayoutList } from 'lucide-react';

// ─── OI Bar cell ──────────────────────────────────────────────────────────────

const OIBarCell = ({ value, max, side }) => {
  if (!max || !value) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const pct = Math.min(80, (value / max) * 80);
  return (
    <div className="oi-cell">
      <span>{value.toLocaleString('en-IN')}</span>
      <div className={`oi-bar ${side}`} style={{ width: pct }} />
    </div>
  );
};

// ─── Option Chain Table ───────────────────────────────────────────────────────

export const OptionChainTab = ({ data }) => {
  const rows = data?.optionChain || [];
  const spot = data?.analytics?.spot || 0;

  const { displayRows, allRows, maxCallOI, maxPutOI, atmStrike } = useMemo(() => {
    if (!rows.length) return { displayRows: [], allRows: [], maxCallOI: 1, maxPutOI: 1, atmStrike: 0 };

    // Deduplicate by strike (take first occurrence)
    const seen = new Set();
    const unique = rows.filter((r) => {
      if (seen.has(r.strike)) return false;
      seen.add(r.strike);
      return true;
    });

    const sorted = [...unique].sort((a, b) => a.strike - b.strike);
    const atm = sorted.reduce((best, r) =>
      Math.abs(r.strike - spot) < Math.abs(best.strike - spot) ? r : best,
      sorted[0]
    );

    // Find atm index, take 10 strikes above and below (21 total)
    const atmIdx = sorted.findIndex((r) => r.strike === atm.strike);
    const start = Math.max(0, atmIdx - 10);
    const end = Math.min(sorted.length - 1, atmIdx + 10);
    const display = sorted.slice(start, end + 1);

    const mCallOI = Math.max(...display.map((r) => r.callOI || 0), 1);
    const mPutOI = Math.max(...display.map((r) => r.putOI || 0), 1);
    return { displayRows: display, allRows: sorted, maxCallOI: mCallOI, maxPutOI: mPutOI, atmStrike: atm.strike };
  }, [rows, spot]);

  if (!rows.length) {
    return (
      <div className="card slide-up-1" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <LayoutList size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
        <div style={{ fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>NO CHAIN DATA</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Authenticate via Fyers to stream live computation</div>
      </div>
    );
  }

  return (
    <div className="stack fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          ATM: <strong style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>
            {atmStrike.toLocaleString('en-IN')}
          </strong>
          &nbsp;·&nbsp;Spot: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {spot ? spot.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
          </strong>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          ATM ± 10 · {displayRows.length} shown of {allRows.length} total
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {/* CALL side */}
              <th style={{ textAlign: 'right' }}>CE OI</th>
              <th style={{ textAlign: 'right' }}>CE Chg</th>
              <th style={{ textAlign: 'right' }}>CE Vol</th>
              <th style={{ textAlign: 'right' }}>CE LTP</th>
              {/* Strike */}
              <th style={{ textAlign: 'center', color: 'var(--text-accent)' }}>STRIKE</th>
              {/* PUT side */}
              <th style={{ textAlign: 'left' }}>PE LTP</th>
              <th style={{ textAlign: 'left' }}>PE OI</th>
              <th style={{ textAlign: 'left' }}>PE Chg</th>
              <th style={{ textAlign: 'left' }}>PE Vol</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const isAtm = row.strike === atmStrike;
              const callChgColor = row.callOIChange > 0 ? 'var(--red)' : row.callOIChange < 0 ? 'var(--green)' : '';
              const putChgColor = row.putOIChange > 0 ? 'var(--green)' : row.putOIChange < 0 ? 'var(--red)' : '';

              return (
                <tr key={row.strike} className={isAtm ? 'atm-row' : ''}>
                  {/* CALL side */}
                  <td><OIBarCell value={row.callOI} max={maxCallOI} side="call" /></td>
                  <td style={{ color: callChgColor, fontFamily: 'var(--font-mono)' }}>
                    {row.callOIChange != null ? (row.callOIChange > 0 ? '+' : '') + row.callOIChange.toLocaleString('en-IN') : '—'}
                  </td>
                  <td>{row.callVolume?.toLocaleString('en-IN') || '—'}</td>
                  <td>{row.callLtp?.toFixed(2) || '—'}</td>
                  {/* Strike */}
                  <td style={{
                    textAlign: 'center',
                    fontWeight: isAtm ? 700 : 500,
                    color: isAtm ? 'var(--text-accent)' : 'var(--text-primary)',
                    background: isAtm ? 'rgba(59,130,246,0.12)' : undefined,
                    position: 'sticky'
                  }}>
                    {row.strike.toLocaleString('en-IN')}
                    {isAtm && <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--text-accent)' }}>ATM</span>}
                  </td>
                  {/* PUT side */}
                  <td style={{ textAlign: 'left' }}>{row.putLtp?.toFixed(2) || '—'}</td>
                  <td style={{ textAlign: 'left' }}>
                    <div className="oi-cell" style={{ justifyContent: 'flex-start' }}>
                      <div className={`oi-bar put`} style={{ width: Math.min(80, ((row.putOI || 0) / maxPutOI) * 80) }} />
                      <span>{row.putOI?.toLocaleString('en-IN') || '—'}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'left', color: putChgColor, fontFamily: 'var(--font-mono)' }}>
                    {row.putOIChange != null ? (row.putOIChange > 0 ? '+' : '') + row.putOIChange.toLocaleString('en-IN') : '—'}
                  </td>
                  <td style={{ textAlign: 'left' }}>{row.putVolume?.toLocaleString('en-IN') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
