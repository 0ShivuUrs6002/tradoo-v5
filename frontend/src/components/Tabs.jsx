const TABS = [
  { id: 'Dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'Signals', icon: '⚡', label: 'Signals' },
  { id: 'Option Chain', icon: '📋', label: 'Chain' },
  { id: 'Analytics', icon: '🎯', label: 'Analytics' },
  { id: 'Prediction', icon: '🔮', label: 'Predict' },
];

export const Tabs = ({ active, onChange }) => (
  <nav className="tabs" role="tablist">
    {TABS.map((t) => (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={active === t.id}
        className={`tab-btn${active === t.id ? ' active' : ''}`}
        onClick={() => onChange(t.id)}
      >
        <span className="tab-icon">{t.icon}</span>
        <span className="tab-label">{t.label}</span>
      </button>
    ))}
  </nav>
);
