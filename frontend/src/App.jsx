import { useEffect, useMemo, useState } from 'react';
import { useStableDashboard } from './hooks/useStableDashboard';
import { Tabs } from './components/Tabs';
import { DashboardTab } from './components/DashboardTab';
import { SignalsTab } from './components/SignalsTab';
import { OptionChainTab } from './components/OptionChainTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { PredictionTab } from './components/PredictionTab';
import { getLoginUrl, validateAuthCode } from './api';

const AuthPanel = ({ message, onConnect }) => (
  <div className="panel auth-panel">
    <h3>Fyers Connection Required</h3>
    <p>{message}</p>
    <button type="button" className="btn" onClick={onConnect}>Connect Fyers</button>
  </div>
);

const getAuthCodeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('auth_code') || params.get('code') || '';
};

export const App = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [authMessage, setAuthMessage] = useState('Authenticate to enable live data pipeline.');
  const [authCallbackPending, setAuthCallbackPending] = useState(false);
  const [landingEntered, setLandingEntered] = useState(false);
  const { tabData, loading, error, authRequired } = useStableDashboard();

  const connectFyers = async () => {
    try {
      const result = await getLoginUrl();
      if (!result?.authCodeUrl) {
        setAuthMessage('Fyers login URL was empty. Check backend credentials.');
        return;
      }
      window.location.href = result.authCodeUrl;
    } catch (connectError) {
      setAuthMessage(connectError.message || 'Unable to start Fyers login flow.');
    }
  };

  useEffect(() => {
    const authCode = getAuthCodeFromUrl();
    if (!authCode) return;

    let cancelled = false;
    setAuthCallbackPending(true);

    validateAuthCode(authCode)
      .then(() => {
        if (cancelled) return;
        window.history.replaceState({}, document.title, '/');
        window.location.reload();
      })
      .catch((callbackError) => {
        if (cancelled) return;
        setAuthMessage(callbackError.message || 'Auth callback validation failed.');
        setAuthCallbackPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => {
    if (!tabData) return null;

    return {
      ...tabData,
      optionChain: tabData?.meta?.smoothedRows || [],
      candles: tabData?.meta?.candles || []
    };
  }, [tabData]);

  const statusTone = authRequired ? 'warn' : error ? 'danger' : 'ok';
  const statusText = loading
    ? 'Initializing feed'
    : authRequired
      ? 'Auth required'
      : error
        ? `Error: ${error}`
        : 'Stable live feed';

  if (!landingEntered) {
    return (
      <main className="landing-root">
        <section className="landing-card">
          <div className="landing-badge">TRADOO v5</div>
          <h1>Institutional-grade trading analytics</h1>
          <p>
            Stable snapshots, coherent signals, non-flicker rendering, and Fyers-integrated
            market intelligence in one terminal.
          </p>
          <div className="landing-actions">
            <button type="button" className="btn primary" onClick={() => setLandingEntered(true)}>
              Enter Terminal
            </button>
            <button type="button" className="btn" onClick={connectFyers}>
              Connect Fyers
            </button>
          </div>
        </section>
      </main>
    );
  }

  let content = <div className="panel">Waiting for stable data...</div>;

  if (authCallbackPending) {
    content = <div className="panel">Validating Fyers callback...</div>;
  } else if (authRequired && !data) {
    content = <AuthPanel message={authMessage} onConnect={connectFyers} />;
  } else if (data) {
    if (activeTab === 'Dashboard') content = <DashboardTab data={data} />;
    if (activeTab === 'Signals') content = <SignalsTab data={data} />;
    if (activeTab === 'Option Chain') content = <OptionChainTab data={data} />;
    if (activeTab === 'Analytics') content = <AnalyticsTab data={data} />;
    if (activeTab === 'Prediction') content = <PredictionTab data={data} />;
  }

  return (
    <main className="app">
      <header className="header terminal-header">
        <div>
          <h1>TRADOO v5</h1>
          <p className="subtitle">Quantitative analytics terminal</p>
        </div>
        <div className={`status-chip ${statusTone}`}>{statusText}</div>
      </header>

      <section className="top-strip">
        <div className="strip-item">
          <span>Direction</span>
          <strong>{data?.coherence?.coherentDirection || 'N/A'}</strong>
        </div>
        <div className="strip-item">
          <span>Prediction</span>
          <strong>{data?.prediction?.predictionScore ?? 'N/A'}</strong>
        </div>
        <div className="strip-item">
          <span>Bias</span>
          <strong>{data?.analytics?.biasScore ?? 'N/A'}</strong>
        </div>
        <div className="strip-item">
          <span>Volatility</span>
          <strong>{data?.analytics?.volatility ?? 'N/A'}</strong>
        </div>
      </section>

      <Tabs active={activeTab} onChange={setActiveTab} />
      <section className="content">{content}</section>
    </main>
  );
};
