import { LayoutDashboard, Zap, List, PieChart, Target, Settings } from 'lucide-react';

const TABS = [
  { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'Signals', icon: Zap, label: 'Signals' },
  { id: 'Option Chain', icon: List, label: 'Chain' },
  { id: 'Analytics', icon: PieChart, label: 'Analytics' },
  { id: 'Prediction', icon: Target, label: 'Predict' },
  { id: 'Settings', icon: Settings, label: 'Settings' },
];

export const Tabs = ({ active, onChange, worldTabs }) => {
  const visibleTabs = worldTabs || TABS;
  return (
    <nav className="tabs" role="tablist">
      {visibleTabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={`tab-btn${active === t.id ? ' active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span className="tab-icon"><Icon size={18} strokeWidth={2} /></span>
            <span className="tab-label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  );
};

// Tab configurations per world
export const NIFTY_TABS = TABS;

export const COMMODITY_TABS = [
  { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'Prediction', icon: Target, label: 'Predict' },
  { id: 'Settings', icon: Settings, label: 'Settings' },
];

export const CRYPTO_TABS = [
  { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'Prediction', icon: Target, label: 'Predict' },
  { id: 'Settings', icon: Settings, label: 'Settings' },
];
