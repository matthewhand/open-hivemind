import { useState, useCallback } from 'react';

const STORAGE_KEY = 'ui_prefs';

interface UIPrefs {
  advancedMode: boolean;
  showTips: boolean;
}

const defaults: UIPrefs = { advancedMode: false, showTips: true };

function load(): UIPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function save(prefs: UIPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function useUIPrefs() {
  const [prefs, setPrefs] = useState<UIPrefs>(load);

  const setAdvancedMode = useCallback((val: boolean) => {
    setPrefs(p => { const next = { ...p, advancedMode: val }; save(next); return next; });
  }, []);

  const setShowTips = useCallback((val: boolean) => {
    setPrefs(p => { const next = { ...p, showTips: val }; save(next); return next; });
  }, []);

  return { ...prefs, setAdvancedMode, setShowTips };
}
