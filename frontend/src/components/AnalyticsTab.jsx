export const AnalyticsTab = ({ data }) => {
  const analytics = data?.analytics || {};
  const items = [
    ['Momentum', analytics.momentum],
    ['Volatility', analytics.volatility],
    ['GEX', analytics.gex],
    ['Liquidity', analytics.liquidity],
    ['Bias', analytics.biasScore],
    ['VWAP Delta', (analytics.spot ?? 0) - (analytics.vwap ?? 0)]
  ];

  return (
    <div className="grid">
      {items.map(([label, value]) => (
        <div key={label} className="metric">
          <div className="metric-label">{label}</div>
          <div className="metric-value">{value ?? 'N/A'}</div>
        </div>
      ))}
    </div>
  );
};
