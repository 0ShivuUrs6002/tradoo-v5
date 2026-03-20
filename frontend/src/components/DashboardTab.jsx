const Metric = ({ label, value }) => (
  <div className="metric kpi-card">
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
  </div>
);

const MiniChart = ({ candles = [] }) => {
  if (!candles.length) return <div className="chart-placeholder">No chart data</div>;

  const closes = candles.map((c) => c.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const points = closes.map((c, idx) => {
    const x = (idx / Math.max(closes.length - 1, 1)) * 100;
    const y = max === min ? 50 : (1 - ((c - min) / (max - min))) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="mini-chart" preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
};

export const DashboardTab = ({ data }) => {
  const analytics = data?.analytics || {};
  const support = analytics?.support?.strike || '-';
  const resistance = analytics?.resistance?.strike || '-';

  return (
    <div className="grid">
      <Metric label="Spot Price" value={analytics.spot ?? '-'} />
      <Metric label="Futures" value={analytics.futures ?? '-'} />
      <Metric label="VWAP" value={analytics.vwap ?? '-'} />
      <Metric label="Support" value={support} />
      <Metric label="Resistance" value={resistance} />
      <Metric label="Bias Score" value={analytics.biasScore ?? '-'} />
      <Metric label="Momentum" value={analytics.momentum ?? '-'} />
      <Metric label="GEX" value={analytics.gex ?? '-'} />
      <div className="panel large">
        <div className="panel-header">Live Spot Chart</div>
        <MiniChart candles={data?.candles || []} />
      </div>
    </div>
  );
};
