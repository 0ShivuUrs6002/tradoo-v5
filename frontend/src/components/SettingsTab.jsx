import { useState } from 'react';
import { useWorld } from './WorldProvider';
import { useTheme } from './ThemeProvider';
import { TrendingUp, Gem, Zap, Server, Palette, Info, BookOpen, RotateCcw } from 'lucide-react';
import { usePaperTrade, usePaperTradeConfig } from '../hooks/usePaperTrade';

export const SettingsTab = () => {
  const { activeWorld, switchWorld, transitioning } = useWorld();
  const { theme, toggleTheme } = useTheme();
  const [backendUrl, setBackendUrl] = useState(() =>
    localStorage.getItem('TRADO_BACKEND_URL') || ''
  );
  const [saved, setSaved] = useState(false);
  const { isPaperTradeEnabled, togglePaperTrade } = usePaperTradeConfig();
  const { resetAccount } = usePaperTrade();

  const handleResetPaperTrade = () => {
    if (window.confirm('Are you sure you want to reset your paper account balance back to ₹100,000? All active and past trades will be cleared.')) {
      resetAccount();
    }
  };

  const handleSaveBackend = () => {
    localStorage.setItem('TRADO_BACKEND_URL', backendUrl.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const portals = [
    {
      id: 'nifty',
      Icon: TrendingUp,
      title: 'Indian Markets',
      desc: 'Nifty 50, Bank Nifty, option chains, institutional flow analysis, and quantitative predictions.',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)',
      accentColor: '#3b82f6'
    },
    {
      id: 'commodities',
      Icon: Gem,
      title: 'Commodities',
      desc: 'Gold, Silver, Crude Oil, Natural Gas, Copper — live prices, technical analysis, and trend predictions.',
      gradient: 'linear-gradient(135deg, #FFD700 0%, #b87333 100%)',
      accentColor: '#FFD700'
    },
    {
      id: 'crypto',
      Icon: Zap,
      title: 'Crypto Universe',
      desc: 'Bitcoin, Ethereum, Solana, XRP, BNB — 24/7 markets with momentum tracking and multi-timeframe predictions.',
      gradient: 'linear-gradient(135deg, #F7931A 0%, #627EEA 100%)',
      accentColor: '#F7931A'
    }
  ];

  return (
    <div className="stack">
      {/* World Selector */}
      <div style={{ textAlign: 'center', padding: '20px 0 4px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          Trading Universe
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
          Select Your World
        </div>
      </div>

      <div className="settings-grid">
        {portals.map(p => {
          const isActive = activeWorld === p.id;
          return (
            <div
              key={p.id}
              className={`world-portal ${p.id}${isActive ? ' active' : ''}`}
              onClick={() => !transitioning && switchWorld(p.id)}
              style={{ opacity: transitioning ? 0.5 : 1, cursor: transitioning ? 'wait' : 'pointer' }}
            >
              <div className="portal-bg" style={{ background: p.gradient }} />
              <div className="portal-content">
                <div style={{
                  width: 52, height: 52, borderRadius: 'var(--radius-lg)',
                  background: `${p.accentColor}15`, border: `1px solid ${p.accentColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <p.Icon size={26} strokeWidth={1.5} style={{ color: p.accentColor }} />
                </div>
                <div className="portal-title">{p.title}</div>
                <div className="portal-desc">{p.desc}</div>
                {isActive && (
                  <div style={{
                    marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 16px', background: `${p.accentColor}15`, border: `1px solid ${p.accentColor}30`,
                    borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                    color: p.accentColor, fontFamily: 'var(--font-mono)'
                  }}>
                    ACTIVE
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paper Trading */}
      <div className="card slide-up-1">
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} /> Paper Trading Engine
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Mock Trading Status</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 350 }}>
              Enable virtual trading to practice strategies without risk. The engine syncs with real-time Fyers data.
            </div>
          </div>
          <button 
            className={`btn ${isPaperTradeEnabled ? 'success' : 'ghost'}`} 
            onClick={() => togglePaperTrade()} 
            style={{ fontSize: 12, width: 100 }}
          >
            {isPaperTradeEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        
        {isPaperTradeEnabled && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-inset)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
              Reset Account to ₹100,000
            </div>
            <button className="btn ghost" onClick={handleResetPaperTrade} style={{ fontSize: 12, color: 'var(--red)', background: 'transparent' }}>
              <RotateCcw size={14} style={{ marginRight: 6 }} /> Reset All
            </button>
          </div>
        )}
      </div>

      {/* App Settings */}
      <div className="card slide-up-3">
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Palette size={14} /> Appearance
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Theme</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Currently: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </div>
          </div>
          <button className="btn secondary" onClick={toggleTheme} style={{ fontSize: 12 }}>
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>

      {/* Backend URL Config */}
      <div className="card slide-up-4">
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Server size={14} /> Backend Connection
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>API Backend URL</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
            Override the default backend URL. Leave empty to use auto-detection. Useful when connecting from mobile to your laptop.
          </div>
          <input
            type="url"
            className="token-input"
            style={{ resize: 'none', height: 40, padding: '8px 12px' }}
            placeholder="e.g. http://192.168.1.100:4000/api"
            value={backendUrl}
            onChange={e => setBackendUrl(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn primary" onClick={handleSaveBackend} style={{ fontSize: 12 }}>
            {saved ? 'Saved!' : 'Save'}
          </button>
          {backendUrl && (
            <button className="btn ghost" onClick={() => { setBackendUrl(''); localStorage.removeItem('TRADO_BACKEND_URL'); }} style={{ fontSize: 12 }}>
              Reset to Default
            </button>
          )}
        </div>
      </div>

      {/* About */}
      <div className="card slide-up-5">
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={14} /> About TRADO
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Version 5.0 PWA
          </div>
          Institutional-grade quantitative trading terminal with real-time option chain analysis,
          synthetic GEX proxy modeling, multi-factor bias engines, and mathematical support/resistance levels.
          Powered by 9 proprietary analysis engines.
        </div>
      </div>
    </div>
  );
};
