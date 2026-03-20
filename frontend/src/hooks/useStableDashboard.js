import { useEffect, useRef, useState, useMemo } from 'react';
import { fetchDashboard, getAuthStatus } from '../api';

const POLL_MS = 8000;      // Poll every 8 seconds
const FREEZE_MS = 5000;    // Freeze UI for 5s after last stable update
const MAX_SILENT_MS = 30000; // Show error if no successful fetch in 30s

export const useStableDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  // Refs to avoid stale closures and prevent flicker
  const mountedRef = useRef(true);
  const freezeUntilRef = useRef(0);
  const lastSuccessRef = useRef(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const poll = async () => {
      // Skip if a request is already in flight
      if (inFlightRef.current) return;

      // Skip if tab is hidden (save bandwidth)
      if (document.visibilityState === 'hidden') return;

      inFlightRef.current = true;
      try {
        const auth = await getAuthStatus();

        if (!auth?.connected) {
          if (mountedRef.current) {
            setAuthRequired(true);
            setLoading(false);
          }
          return;
        }

        const next = await fetchDashboard();
        if (!mountedRef.current) return;

        lastSuccessRef.current = Date.now();
        setAuthRequired(false);

        if (next?.__warming) {
          // Pipeline warming — keep showing last data if we have it
          setLoading(false);
          return;
        }

        setError('');

        // Stability freeze: only update UI when frozen period has passed
        const now = Date.now();
        const backendFreezeUntil = next?.stability?.frozenUntil || 0;
        const myFreezeUntil = Math.max(freezeUntilRef.current, backendFreezeUntil);

        if (now >= myFreezeUntil) {
          setData(next);
          // Apply local freeze period to prevent flicker
          freezeUntilRef.current = now + FREEZE_MS;
        }

        setLoading(false);
      } catch (err) {
        if (!mountedRef.current) return;

        const isAuthErr = Boolean(err?.payload?.authRequired);
        setAuthRequired(isAuthErr);

        // Only show error if we haven't had a successful fetch in a while
        const timeSinceSuccess = Date.now() - lastSuccessRef.current;
        if (timeSinceSuccess > MAX_SILENT_MS || lastSuccessRef.current === 0) {
          const msg = err?.message || 'Data fetch failed';
          // Don't overwrite auth message with generic errors
          if (!isAuthErr) setError(msg.split(' [')[0]); // trim provider codes from display
        }

        setLoading(false);
      } finally {
        inFlightRef.current = false;
      }
    };

    // Initial poll
    poll();
    const timer = setInterval(poll, POLL_MS);

    // Also poll when tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return useMemo(() => ({
    tabData: data,
    loading,
    error,
    authRequired
  }), [data, loading, error, authRequired]);
};
