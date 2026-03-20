import { useEffect, useMemo, useState } from 'react';
import { useStableDashboard } from './hooks/useStableDashboard';
import { Tabs } from './components/Tabs';
import { DashboardTab } from './components/DashboardTab';
import { SignalsTab } from './components/SignalsTab';
import { OptionChainTab } from './components/OptionChainTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { PredictionTab } from './components/PredictionTab';
import { getLoginUrl, logoutAuth, setManualToken, validateAuthCode } from './api';

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
      <div className="auth-card slide-up-1">
        <div className="auth-title">Connect to Fyers</div>
        <div className="auth-subtitle">
          Authenticate with your Fyers account to enable the live data pipeline.
        </div>

        <div className="stepper">
          <div className="step-item">
            <div className="step-num">1</div>
            <div className="step-text">
              <strong>Open Fyers Login</strong>
              <p>Click the button below to open the Fyers authorization page in your browser.</p>
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">2</div>
            <div className="step-text">
              <strong>Log In & Authorize</strong>
              <p>Log in with your Fyers credentials and approve access for TRADO.</p>
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">3</div>
            <div className="step-text">
              <strong>Auto-Connect or Paste Token</strong>
              <p>TRADO will auto-detect the auth code from the redirect URL. If it fails, paste your access token below.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn primary btn-full"
          onClick={onConnect}
          disabled={connecting}
          style={{ marginBottom: 12 }}
        >
          {connecting ? '↻ Redirecting…' : '⚡ Connect Fyers'}
        </button>

        {message && message !== 'Authenticate to enable live data pipeline.' && (
          <div style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            color: '#f87171',
            marginBottom: 12,
            lineHeight: 1.5
          }}>
            ⚠ {message}
          </div>
        )}
      </div>

      <div className="auth-card slide-up-2" style={{ borderColor: 'rgba(55,80,140,0.3)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Manual Fallback — Paste Access Token
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
          If you already have an access token from the Fyers API Dashboard,
          paste it directly here to skip the OAuth flow.
        </div>
        <textarea
          className="token-input"
          placeholder="Paste your Fyers access token here…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={3}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            className="btn success"
            onClick={handleSubmit}
            disabled={!token.trim() || submitting}
          >
            {submitting ? 'Connecting…' : '✓ Use Token'}
          </button>
          <button type="button" className="btn ghost btn-sm" onClick={onReset}>
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
    <div className="landing-inner">
      <div className="slide-up-1">
        <span className="landing-eyebrow">
          <span className="eyebrow-dot" />
          TRADO v5 · Quant Trading Terminal
        </span>
      </div>

      <div className="slide-up-2">
        <h1 className="landing-headline">
          Institutional-grade<br />
          <span className="hl-accent">trading intelligence</span>
        </h1>
        <p className="landing-sub">
          Real-time option chain analytics, GEX, bias signals, prediction engine and
          stable non-flickering data — all powered by Fyers API.
        </p>
      </div>

      <div className="landing-actions slide-up-3">
        <button type="button" className="btn primary" onClick={onEnter} style={{ fontSize: 15, padding: '13px 28px' }}>
          Enter Terminal →
        </button>
        <button type="button" className="btn ghost" onClick={onConnect} disabled={connecting}>
          {connecting ? 'Redirecting…' : '⚡ Connect Fyers'}
        </button>
      </div>

      <div className="landing-features slide-up-4" style={{ marginTop: 4 }}>
        {[
          { icon: '📊', title: 'Live Option Chain', desc: 'Real-time OI, OI change, volume with ATM highlighting' },
          { icon: '🎯', title: 'Bias & Prediction', desc: 'Multi-factor market bias and directional prediction score' },
          { icon: '⚡', title: 'GEX Analytics', desc: 'Gamma Exposure tracking with call/put writer signals' },
          { icon: '🔒', title: 'Stable Data', desc: 'EMA smoothing, 3-cycle confirmation, 5s UI freeze' },
          { icon: '📈', title: 'Support/Resistance', desc: 'OI-weighted S/R with 2-min stability lock' },
          { icon: '🔐', title: 'Simple Auth', desc: 'One-click Fyers OAuth or paste token fallback' },
        ].map((f) => (
          <div className="feature-pill" key={f.title}>
            <span className="feature-icon">{f.icon}</span>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
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
    { label: 'Prediction', value: pred.predictionScore != null ? (pred.predictionScore > 0 ? '+' : '') + pred.predictionScore.toFixed(3) : '—' },
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

  const connectFyers = async () => {
    setConnecting(true);
    try {
      const result = await getLoginUrl();
      if (!result?.authCodeUrl) {
        setAuthMessage('Could not get Fyers login URL. Check backend credentials in .env');
        setConnecting(false);
        return;
      }
      window.location.href = result.authCodeUrl;
    } catch (e) {
      setAuthMessage(e.message || 'Unable to start Fyers login.');
      setConnecting(false);
    }
  };

  const connectManualToken = async (tokenValue) => {
    try {
      await setManualToken({ accessToken: tokenValue, refreshToken: '', expiresInSeconds: 43200 });
      window.localStorage.setItem('TRADOO_ENTERED', '1');
      window.location.reload();
    } catch (e) {
      setAuthMessage(e.message || 'Manual token failed.');
    }
  };

  const resetConnection = async () => {
    try {
      await logoutAuth();
      window.localStorage.removeItem('TRADOO_ENTERED');
      window.history.replaceState({}, document.title, '/');
      window.location.reload();
    } catch (e) {
      setAuthMessage(e.message || 'Reset failed.');
    }
  };

  const enterTerminal = () => {
    window.localStorage.setItem('TRADOO_ENTERED', '1');
    setLandingEntered(true);
  };

  // Handle auth callback from Fyers redirect
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
        setAuthMessage(e.message || 'Auth callback failed.');
        window.history.replaceState({}, document.title, '/');
        setConnecting(false);
        setAuthCallbackPending(false);
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
  const statusText = loading ? 'Initializing…' : authRequired ? 'Auth required' : error ? 'Feed error' : 'Live feed';

  // Landing
  if (!landingEntered) {
    return <Landing onEnter={enterTerminal} onConnect={connectFyers} connecting={connecting} />;
  }

  // Determine tab content
  let content;
  if (authCallbackPending) {
    content = (
      <div className="card fade-in" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚙</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Validating Fyers Auth…</div>
        <div style={{ fontSize: 12 }}>Please wait while we complete authentication.</div>
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
            <div className="skeleton" style={{ height: 12, width: '50%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 24, width: '70%' }} />
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
              <div className="brand-version">v5 · Quant Terminal</div>
            </div>
          </div>
          <div className="header-right">
            {data && <TopStrip data={data} />}
            <div className={`status-badge ${statusTone}`}>
              <span className="status-dot" />
              {statusText}
            </div>
            {data && (
              <button type="button" className="btn ghost btn-sm" onClick={resetConnection} title="Disconnect">
                ⏏
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <Tabs active={activeTab} onChange={setActiveTab} />

        {/* Content */}
        <section className="content fade-in">{content}</section>
      </main>
    </>
  );
};
