import { useState, useEffect, useRef, useCallback } from 'react';

export type AlertState<T extends string = 'success' | 'error' | 'warning'> = {
  type: T;
  message: string;
} | null;

export function useAutoHide<T extends string = 'success' | 'error' | 'warning'>(
  defaultDuration = 5000
) {
  const [alert, setAlertState] = useState<AlertState<T>>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setAlert = useCallback(
    (value: AlertState<T>, duration = defaultDuration) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setAlertState(value);
      if (value !== null) {
        timerRef.current = setTimeout(() => setAlertState(null), duration);
      }
    },
    [defaultDuration]
  );

  return { alert, setAlert };
}
