import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTvDisplayData } from '../services/tvCast.service';

export function useTvDisplayData(branchId, counterId, intervalMs = 3000) {
  const [display, setDisplay] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [lastSync, setLastSync] = useState('');
  const previousToken = useRef('');

  const refresh = useCallback(async () => {
    if (!branchId || !counterId) return;
    try {
      const data = await fetchTvDisplayData(branchId, counterId);
      if (data.success) {
        const nextDisplay = data.display;
        setDisplay({ ...nextDisplay, changed: previousToken.current !== nextDisplay.current_token });
        previousToken.current = nextDisplay.current_token;
        setLastSync(new Date().toLocaleTimeString());
        setStatus('connected');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('reconnecting');
    }
  }, [branchId, counterId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, refresh]);

  return { display, status, lastSync, refresh };
}
