import { useEffect, useMemo, useState, useCallback } from 'react';
import { useStableDashboard } from './hooks/useStableDashboard';
import { Tabs, NIFTY_TABS, COMMODITY_TABS, CRYPTO_TABS } from './components/Tabs';
import { DashboardTab } from './components/DashboardTab';
import { SignalsTab } from './components/SignalsTab';
import { OptionChainTab } from './components/OptionChainTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { PredictionTab } from './components/PredictionTab';
import { PaperTradeWorkspace } from './components/PaperTradeWorkspace';
import { PaperTradeTracker } from './components/PaperTradeTracker';
import { SettingsTab } from './components/SettingsTab';
import { WorldDashboard } from './components/WorldDashboard';
import { AssetDropdown } from './components/AssetDropdown';
import { WorldTransition } from './components/WorldTransition';
import { getLoginUrl, logoutAuth, setManualToken, validateAuthCode, fetchWorldData } from './api';
import {
  Activity, ArrowRight, Check, Zap, LogOut,
  Target, ShieldCheck, TrendingUp, Key, Loader2, AlertTriangle,
  Sun, Moon, Download, X
} from 'lucide-react';
import { useTheme } from './components/ThemeProvider';
import { useWorld } from './components/WorldProvider';
import { usePaperTradeConfig } from './hooks/usePaperTrade';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRawParam = (source, key) => {
  if (!source) return '';
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`[?&#]${escaped}=([^&#]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const getAuthCodeFromUrl = () => {
  const s = window.location.search || '';
  const h = window.location.hash || '';
  return getRawParam(s, 'auth_code') || getRawParam(s, 'code') || getRawParam(s, 'authCode')
    || getRawParam(h, 'auth_code') || getRawParam(h, 'code') || '';
};

const getAccessTokenFromUrl = () => {
  const s = window.location.search || '';
  const h = window.location.hash || '';
  return getRawParam(s, 'access_token') || getRawParam(s, 'auth_token') || getRawParam(s, 'token')
    || getRawParam(h, 'access_token') || getRawParam(h, 'auth_token') || '';
};

// ─── Auth Stepper ─────────────────────────────────────────────────────────────

const AuthPanel = ({ message, onConnect, onManualConnect, onReset, connecting }) => {
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token.trim()) return;
    setSubmitting(true);
    await onManualConnect(token.trim());
    setSubmitting(false);
  };

  return (
    <div className="auth-root fade-in">
      <div className="card slide-up-1">
        <div className="auth-title">Connect Platform</div>
        <div className="auth-subtitle">
          Authenticate via Fyers OAuth to activate real-time intelligence feeds.
        </div>

        <div className="stepper">
          <div className="step-item">
            <div className="step-num">1</div>
            <div className="step-text">
              <strong>Initiate OAuth</strong>
              <p>Redirect securely to Fyers authorization gateway.</p>
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">2</div>
            <div className="step-text">
              <strong>Grant Access</strong>
              <p>Approve application scope for live data access.</p>
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">3</div>
            <div className="step-text">
              <strong>Establish Link</strong>
              <p>System auto-captures code and initiates terminal pipeline.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn primary btn-full"
          onClick={onConnect}
          disabled={connecting}
          style={{ marginBottom: 14 }}
        >
          {connecting ? (
            <><Loader2 className="animate-spin" size={16} /> Redirecting</>
          ) : (
            <><Zap size={16} /> Authenticate Broker</>
          )}
        </button>

        {message && message !== 'Authenticate to enable live data pipeline.' && (
          <div className="alert-box error">
            <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}
      </div>

      <div className="card slide-up-2">
        <div className="auth-override-title">
          Manual Override
        </div>
        <p className="auth-override-desc">
          Bypass standard OAuth flow manually via direct token ingestion.
        </p>
        <textarea
          className="token-input"
          placeholder="Enter institutional access token here"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={3}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            className="btn success"
            onClick={handleSubmit}
            disabled={!token.trim() || submitting}
          >
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            <span>{submitting ? 'Verifying' : 'Inject Token'}</span>
          </button>
          <button type="button" className="btn ghost" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Landing Page ─────────────────────────────────────────────────────────────

const Landing = ({ onEnter, onConnect, connecting }) => (
  <main className="landing-root">
    <div className="landing-bg" />
    <div className="landing-grid-pattern" />
    <div className="landing-glow" />
    <div className="landing-inner">
      <div className="slide-up-1">
        <span className="landing-eyebrow">
          <span className="eyebrow-dot" />
          SYSTEM V5 · TRADING TERMINAL
        </span>
      </div>

      <div className="slide-up-2">
        <h1 className="landing-headline">
          Institutional-grade<br />
          <span className="hl-accent">trading intelligence</span>
        </h1>
        <p className="landing-sub">
          Continuous low-latency option chain computation, synthetic GEX proxy modeling, multi-factor bias engines, and mathematical support levels.
        </p>
      </div>

      <div className="landing-actions slide-up-3">
        <button type="button" className="btn primary" onClick={onEnter}>
          Launch Terminal <ArrowRight size={18} />
        </button>
        <button type="button" className="btn secondary" onClick={onConnect} disabled={connecting}>
          {connecting ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
          <span>Broker Link</span>
        </button>
      </div>

      <div className="landing-features slide-up-4">
        {[
          { icon: Activity, title: 'Synthetic Chain', desc: 'Real-time structured derivation of delta and volume.' },
          { icon: Target, title: 'Bias Engine', desc: 'Predictive multi-factor directional modeling.' },
          { icon: Zap, title: 'GEX Proxy', desc: 'Gamma-driven institutional exposure estimation.' },
          { icon: ShieldCheck, title: 'Stable Feed', desc: 'Sub-second EMA filtering with 3-cycle consensus.' },
          { icon: TrendingUp, title: 'Quantitative S/R', desc: 'OI-weighted liquidity walls calculation.' },
          { icon: Key, title: 'Secure OAuth', desc: 'Direct encrypted credential pipelines.' },
        ].map((f) => (
          <div className="feature-pill" key={f.title}>
            <div className="feature-icon-wrap"><f.icon size={18} strokeWidth={1.5} /></div>
            <div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </main>
);

// ─── Top Strip ────────────────────────────────────────────────────────────────

const TopStrip = ({ data }) => {
  const a = data?.analytics || {};
  const pred = data?.prediction || {};
  const coh = data?.coherence || {};

  const items = [
    { label: 'Spot', value: a.spot ? a.spot.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—' },
    { label: 'Bias', value: a.biasScore != null ? (a.biasScore > 0 ? '+' : '') + a.biasScore.toFixed(3) : '—' },
    { label: 'Direction', value: coh.coherentDirection || '—' },
    { label: 'Predict', value: pred.predictionScore != null ? (pred.predictionScore > 0 ? '+' : '') + pred.predictionScore.toFixed(3) : '—' },
  ];

  return (
    <div className="top-strip">
      {items.map((item) => (
        <div className="strip-card" key={item.label}>
          <div className="strip-label">{item.label}</div>
          <div className="strip-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
};

// ─── PWA Install Banner ────────────────────────────────────────────────────────

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not dismissed before
      const dismissed = localStorage.getItem('TRADO_PWA_DISMISSED');
      if (!dismissed) setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('TRADO_PWA_DISMISSED', '1');
  };

  if (!showBanner) return null;

  return (
    <div className="pwa-install-banner">
      <div>
        <div className="pwa-text">Install TRADO App</div>
        <div className="pwa-sub">Add to home screen for instant access</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="pwa-install-btn" onClick={handleInstall}>
          <Download size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Install
        </button>
        <button className="pwa-dismiss-btn" onClick={handleDismiss}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

export const App = () => {
  const initialAuthCode = getAuthCodeFromUrl();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [authMessage, setAuthMessage] = useState('Authenticate to enable live data pipeline.');
  const [authCallbackPending, setAuthCallbackPending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [landingEntered, setLandingEntered] = useState(() => {
    return window.localStorage.getItem('TRADOO_ENTERED') === '1' || Boolean(initialAuthCode);
  });

  const { tabData, loading, error, authRequired } = useStableDashboard();
  const { theme, toggleTheme } = useTheme();
  const { activeWorld, selectedAsset, transitioning, worldConfig } = useWorld();
  const { isPaperTradeEnabled } = usePaperTradeConfig();
  const [showWorkspace, setShowWorkspace] = useState(false);

  // World data for commodity/crypto
  const [worldData, setWorldData] = useState(null);
  const [worldLoading, setWorldLoading] = useState(false);
  const [worldError, setWorldError] = useState(null);
  const [chartDays, setChartDays] = useState(1);

  // Fetch world data when world or asset changes
  useEffect(() => {
    if (activeWorld === 'nifty') { setWorldData(null); return; }
    let cancelled = false;
    const load = async () => {
      setWorldLoading(true);
      setWorldError(null);
      try {
        const data = await fetchWorldData(activeWorld, selectedAsset, chartDays);
        if (!cancelled) setWorldData(data);
      } catch (err) {
        if (!cancelled) setWorldError(err.message);
      } finally {
        if (!cancelled) setWorldLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeWorld, selectedAsset, chartDays]);

  const connectFyers = async () => {
    setConnecting(true);
    try {
      const result = await getLoginUrl();
      if (!result?.authCodeUrl) {
        setAuthMessage('System configuration error. Check backend VITE_FYERS_APP_ID.');
        setConnecting(false);
        return;
      }
      window.location.href = result.authCodeUrl;
    } catch (e) {
      setAuthMessage(e.message || 'Unable to establish auth gateway connection.');
      setConnecting(false);
    }
  };

  const connectManualToken = async (tokenValue) => {
    try {
      await setManualToken({ accessToken: tokenValue, refreshToken: '', expiresInSeconds: 43200 });
      window.localStorage.setItem('TRADOO_ENTERED', '1');
      window.location.reload();
    } catch (e) {
      setAuthMessage(e.message || 'Token injection failed.');
    }
  };

  const resetConnection = async () => {
    try {
      await logoutAuth();
      window.localStorage.removeItem('TRADOO_ENTERED');
      window.history.replaceState({}, document.title, '/');
      window.location.reload();
    } catch (e) {
      setAuthMessage(e.message || 'Session purge failed.');
    }
  };

  const enterTerminal = () => {
    window.localStorage.setItem('TRADOO_ENTERED', '1');
    setLandingEntered(true);
  };

  useEffect(() => {
    const authCode = getAuthCodeFromUrl();
    const accessToken = getAccessTokenFromUrl();
    if (!authCode && !accessToken) return;

    let cancelled = false;
    setAuthCallbackPending(true);

    const handler = accessToken
      ? setManualToken({ accessToken, refreshToken: '', expiresInSeconds: 43200 })
      : validateAuthCode(authCode);

    handler
      .then(() => {
        if (cancelled) return;
        window.localStorage.setItem('TRADOO_ENTERED', '1');
        window.history.replaceState({}, document.title, '/');
        window.location.reload();
      })
      .catch((e) => {
        if (cancelled) return;
        setAuthMessage(e.message || 'Auth handshake rejected.');
        window.history.replaceState({}, document.title, '/');
        setConnecting(false);
        setAuthCallbackPending(false);
        
        if (window.localStorage.getItem('TRADOO_ENTERED') !== '1') {
          setLandingEntered(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (authRequired) setConnecting(false);
  }, [authRequired]);

  const data = useMemo(() => {
    if (!tabData) return null;
    return {
      ...tabData,
      optionChain: tabData?.meta?.smoothedRows || [],
      candles: tabData?.meta?.candles || []
    };
  }, [tabData]);

  const statusTone = authRequired ? 'warn' : error ? 'danger' : loading ? 'warn' : 'ok';
  const statusText = loading ? 'INITIALIZING' : authRequired ? 'AUTH PENDING' : error ? 'DISCONNECTED' : 'LIVE';

  // Landing
  if (!landingEntered) {
    return <Landing onEnter={enterTerminal} onConnect={connectFyers} connecting={connecting} />;
  }

  // Determine tab content
  let content;
  if (error && !data && !authRequired && !authCallbackPending) {
    content = (
      <div className="card fade-in" style={{ textAlign: 'center', padding: '60px 32px', borderColor: 'var(--red)' }}>
        <AlertTriangle size={40} style={{ margin: '0 auto 16px', color: 'var(--red)' }} strokeWidth={1.5} />
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, letterSpacing: 1, color: 'var(--text-primary)' }}>CONNECTION FAILED</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
          {error}
        </div>
      </div>
    );
  } else if (authCallbackPending) {
    content = (
      <div className="card fade-in" style={{ textAlign: 'center', padding: '48px 32px' }}>
        <Loader2 className="animate-spin" size={36} style={{ margin: '0 auto 16px', color: 'var(--text-accent)' }} />
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, letterSpacing: 1 }}>VERIFYING CREDENTIALS</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Establishing secure pipeline connection...</div>
      </div>
    );
  } else if (authRequired && !data) {
    content = (
      <AuthPanel
        message={authMessage}
        onConnect={connectFyers}
        onManualConnect={connectManualToken}
        onReset={resetConnection}
        connecting={connecting}
      />
    );
  } else if (data) {
    if (activeTab === 'Dashboard') content = <DashboardTab data={data} />;
    else if (activeTab === 'Signals') content = <SignalsTab data={data} />;
    else if (activeTab === 'Option Chain') content = <OptionChainTab data={data} />;
    else if (activeTab === 'Analytics') content = <AnalyticsTab data={data} />;
    else if (activeTab === 'Prediction') content = <PredictionTab data={data} />;
  } else {
    content = (
      <div className="grid2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kpi-card">
            <div className="skeleton" style={{ height: 10, width: '40%', marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 28, width: '60%' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="app-bg" />
      <main className="app">
        {/* Header */}
        <header className="app-header">
          <div className="app-brand">
            <div className="brand-logo">T5</div>
            <div>
              <div className="brand-name">TRADO</div>
              <div className="brand-version">TERMINAL OS</div>
            </div>
          </div>
          <div className="header-right">
            {data && <TopStrip data={data} />}
            {data && activeWorld === 'nifty' && <PaperTradeTracker data={data} onOpenWorkspace={() => setShowWorkspace(true)} />}
            {activeWorld !== 'nifty' && <AssetDropdown />}
            <div className={`status-badge ${statusTone}`}>
              <span className={`status-dot ${statusTone}`} />
              {statusText}
            </div>
            {data && (
              <>
                <button type="button" className="btn ghost icon-only" onClick={toggleTheme} title="Toggle Theme">
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button type="button" className="btn ghost icon-only" onClick={resetConnection} title="Terminate Connection">
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Tabs */}
        <Tabs
          active={activeTab}
          onChange={setActiveTab}
          worldTabs={
            activeWorld === 'commodities' ? COMMODITY_TABS 
            : activeWorld === 'crypto' ? CRYPTO_TABS 
            : NIFTY_TABS
          }
        />

        {/* Content */}
        <section className="content fade-in">
          {activeTab === 'Settings' ? (
            <SettingsTab />
          ) : activeWorld !== 'nifty' ? (
            worldLoading && !worldData ? (
              <div className="grid2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="kpi-card">
                    <div className="skeleton" style={{ height: 10, width: '40%', marginBottom: 10 }} />
                    <div className="skeleton" style={{ height: 28, width: '60%' }} />
                  </div>
                ))}
              </div>
            ) : worldError ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 32px', borderColor: 'var(--red)' }}>
                <AlertTriangle size={36} style={{ margin: '0 auto 12px', color: 'var(--red)' }} />
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Data Error</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{worldError}</div>
              </div>
            ) : worldData ? (
              <WorldDashboard data={worldData} worldType={activeWorld} onPeriodChange={setChartDays} activePeriod={chartDays} />
            ) : null
          ) : (
            content
          )}
        </section>

        {/* World Transition Overlay */}
        <WorldTransition />

        {/* Paper Trade Full-Screen Workspace */}
        {showWorkspace && <PaperTradeWorkspace data={data} onClose={() => setShowWorkspace(false)} />}

        {/* PWA Install Banner */}
        <PWAInstallBanner />
      </main>
    </>
  );
};
