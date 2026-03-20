export const PredictionTab = ({ data }) => {
  const prediction = data?.prediction || {};
  const coherence = data?.coherence || {};
  const stability = data?.stability || {};
  const tone = prediction.direction === 'BULLISH' ? 'ok' : prediction.direction === 'BEARISH' ? 'danger' : 'neutral';

  return (
    <div className="stack">
      <div className="panel">
        <h3>Prediction Score</h3>
        <p>{prediction.predictionScore ?? 'N/A'}</p>
      </div>
      <div className="panel">
        <h3>Direction</h3>
        <p><span className={`badge ${tone}`}>{prediction.direction || 'N/A'}</span></p>
      </div>
      <div className="panel">
        <h3>Confidence</h3>
        <p>{prediction.confidence ?? 'N/A'}</p>
      </div>
      <div className="panel">
        <h3>Coherence Score</h3>
        <p>{coherence.coherenceScore ?? 'N/A'}</p>
      </div>
      <div className="panel">
        <h3>Stable Cycles</h3>
        <p>{stability.confirmedCycles ?? 0}</p>
      </div>
    </div>
  );
};
