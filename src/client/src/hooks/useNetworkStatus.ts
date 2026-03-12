import { useState, useEffect, useRef, useCallback } from 'react';

export interface QueuedMessage {
  content: string;
  botId: string;
}

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const queueRef = useRef<QueuedMessage[]>([]);
  const flushCallbackRef = useRef<((msg: QueuedMessage) => Promise<void>) | null>(null);

  const enqueue = useCallback((msg: QueuedMessage) => {
    queueRef.current = [...queueRef.current, msg];
  }, []);

  const registerFlush = useCallback((fn: (msg: QueuedMessage) => Promise<void>) => {
    flushCallbackRef.current = fn;
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      if (!flushCallbackRef.current || queueRef.current.length === 0) return;
      const pending = queueRef.current;
      queueRef.current = [];
      for (const msg of pending) {
        await flushCallbackRef.current(msg).catch(() => {
          queueRef.current = [...queueRef.current, msg];
        });
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline, enqueue, registerFlush, queueLength: queueRef.current.length };
}
