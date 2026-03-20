import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchDashboard } from '../api';

const POLL_MS = 6000;

export const useStableDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const freezeUntilRef = useRef(0);
  const latestRef = useRef(null);
  const dataRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const next = await fetchDashboard();
        latestRef.current = next;
        dataRef.current = next;

        const now = Date.now();
        const freezeUntil = next?.stability?.frozenUntil || 0;
        if (now >= freezeUntilRef.current) {
          setData(next);
          freezeUntilRef.current = freezeUntil;
        }

        setAuthRequired(false);
        setError('');
      } catch (err) {
        const nextAuthRequired = Boolean(err?.payload?.authRequired);
        if (mounted) {
          setAuthRequired(nextAuthRequired);
          if (!dataRef.current) setError(err.message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const derived = useMemo(() => ({
    tabData: data,
    loading,
    error,
    authRequired
  }), [data, loading, error, authRequired]);

  return derived;
};
