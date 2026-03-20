export const TABS = ['Dashboard', 'Signals', 'Option Chain', 'Analytics', 'Prediction'];

export const Tabs = ({ active, onChange }) => (
  <div className="tabs">
    {TABS.map((tab) => (
      <button
        key={tab}
        className={`tab ${active === tab ? 'active' : ''}`}
        onClick={() => onChange(tab)}
        type="button"
      >
        {tab}
      </button>
    ))}
  </div>
);
