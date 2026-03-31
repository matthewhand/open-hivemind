import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  selectUI,
  setAnimationsEnabled,
  setRefreshInterval,
  setShowKeyboardShortcuts,
  setShowTooltips,
  setTheme,
  toggleAutoRefresh,
} from '../store/slices/uiSlice';
import type { UIState } from '../store/slices/uiSlice';
import { Accordion } from './DaisyUI/Accordion';
import type { AccordionItem } from './DaisyUI/Accordion';
import { useConfigDiff } from '../hooks/useConfigDiff';
import { ConfigDiffViewer, ConfigDiffConfirmDialog } from './ConfigDiffViewer';
import AdvancedThemeSwitcher from './DaisyUI/AdvancedThemeSwitcher';
import Toggle from './DaisyUI/Toggle';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const ui = useAppSelector(selectUI);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDiffConfirm, setShowDiffConfirm] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState(true);

  const settingsAsRecord = useMemo(() => ({
    theme: ui.theme,
    autoRefreshEnabled: ui.autoRefreshEnabled,
    refreshInterval: ui.refreshInterval,
    animationsEnabled: ui.animationsEnabled,
    showTooltips: ui.showTooltips,
    showKeyboardShortcuts: ui.showKeyboardShortcuts,
  }) as Record<string, unknown>, [ui.theme, ui.autoRefreshEnabled, ui.refreshInterval, ui.animationsEnabled, ui.showTooltips, ui.showKeyboardShortcuts]);

  const { hasChanges, diff, setOriginalConfig } = useConfigDiff(settingsAsRecord);

  useEffect(() => {
    if (originalSnapshot) {
      setOriginalConfig(settingsAsRecord);
      setOriginalSnapshot(false);
    }
  }, [originalSnapshot, settingsAsRecord, setOriginalConfig]);

  const accordionItems: AccordionItem[] = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: '🎨',
      content: (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Theme Selection</h3>
            <p className="text-sm text-base-content/70 mb-4">Choose a theme to customize your experience.</p>
            <AdvancedThemeSwitcher
              currentTheme={ui.theme}
              onThemeChange={handleThemeSelect}
              position="inline"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'dashboard',
      title: 'Dashboard Settings',
      icon: '📊',
      content: (
        <div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Auto Refresh</span>
              <Toggle
                className="toggle toggle-primary"
                checked={ui.autoRefreshEnabled}
                onChange={handleAutoRefreshToggle}
              />
            </label>
          </div>
          <div className="mt-4 form-control w-full max-w-xs">
            <label className="label">
              <span className="label-text text-base-content/70">Refresh Interval:</span>
            </label>
            <select
              className="select select-bordered select-sm w-full"
              value={ui.refreshInterval}
              onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
              disabled={!ui.autoRefreshEnabled}
            >
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: 'accessibility',
      title: 'Accessibility',
      icon: '♿',
      content: (
        <div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Reduced Motion</span>
              <Toggle
                className="toggle toggle-primary"
                checked={!ui.animationsEnabled}
                onChange={(event) => dispatch(setAnimationsEnabled(!event.target.checked))}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Show Tooltips</span>
              <Toggle
                className="toggle toggle-primary"
                checked={ui.showTooltips}
                onChange={(event) => dispatch(setShowTooltips(event.target.checked))}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Keyboard Shortcuts Overlay</span>
              <Toggle
                className="toggle toggle-primary"
                checked={ui.showKeyboardShortcuts}
                onChange={(event) => dispatch(setShowKeyboardShortcuts(event.target.checked))}
              />
            </label>
          </div>
        </div>
      ),
    },
  ];

  const handleThemeSelect = (mode: string) => {
    dispatch(setTheme(mode));
  };

  const handleAutoRefreshToggle = () => {
    dispatch(toggleAutoRefresh());
  };

  const handleRefreshIntervalChange = (interval: number) => {
    dispatch(setRefreshInterval(interval));
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    // Simulate API call
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saved');
      resetTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Settings
      </h1>

      {saveStatus === 'saved' && (
        <div className="alert alert-success mb-6">
          <span>Settings saved successfully!</span>
        </div>
      )}

      <Accordion items={accordionItems} allowMultiple defaultOpenItems={['appearance']} />

      {hasChanges && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold opacity-70 mb-2">Pending changes:</h3>
          <ConfigDiffViewer diff={diff} mode="unified" maxHeight="12rem" />
        </div>
      )}

      <div className="flex gap-4 mt-6">
        <button
          className="btn btn-primary"
          onClick={() => hasChanges ? setShowDiffConfirm(true) : handleSaveSettings()}
          disabled={saveStatus === 'saving'}
          aria-label="Save Settings"
        >
          {saveStatus === 'saving' ? <span className="loading loading-spinner" aria-hidden="true"></span> : null}
          {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          className="btn btn-outline"
          onClick={() => window.location.reload()}
          aria-label="Reset to Defaults"
        >
          Reset to Defaults
        </button>
      </div>

      <ConfigDiffConfirmDialog
        isOpen={showDiffConfirm}
        diff={diff}
        onConfirm={() => { setShowDiffConfirm(false); handleSaveSettings(); }}
        onCancel={() => setShowDiffConfirm(false)}
        title="Confirm Settings Changes"
        loading={saveStatus === 'saving'}
      />
    </div>
  );
};

export default Settings;
