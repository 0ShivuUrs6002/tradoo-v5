export const SignalsTab = ({ data }) => {
  const analytics = data?.analytics || {};
  const coherence = data?.coherence || {};
  const direction = coherence.coherentDirection || 'N/A';
  const directionTone = direction === 'BULLISH' ? 'ok' : direction === 'BEARISH' ? 'danger' : 'neutral';

  return (
    <div className="stack">
      <div className="panel">
        <h3>Writer Flow</h3>
        <p>{analytics.writerRelation || 'N/A'}</p>
      </div>
      <div className="panel">
        <h3>Coherent Direction</h3>
        <p><span className={`badge ${directionTone}`}>{direction}</span></p>
      </div>
      <div className="panel">
        <h3>Breakout Score</h3>
        <p>{analytics.breakoutScore ?? 'N/A'}</p>
      </div>
    </div>
  );
};
