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
import Tooltip from './DaisyUI/Tooltip';
import Button from './DaisyUI/Button';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const ui = useAppSelector(selectUI);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
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

  const themeOptions: Array<{ value: UIState['theme']; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'high-contrast', label: 'High Contrast' },
    { value: 'auto', label: 'Auto (System)' },
  ];

  const accordionItems: AccordionItem[] = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: '🎨',
      content: (
        <div>
          <div className="form-control">
            <Tooltip content="Toggle between light and dark theme" position="right">
              <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text">Dark Mode</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={ui.theme === 'dark'}
                  onChange={(event) => handleThemeToggle(event.target.checked)}
                  aria-label="Toggle dark mode"
                />
              </label>
            </Tooltip>
          </div>
          <div className="divider my-2"></div>
          <div className="form-control w-full max-w-xs">
            <label className="label">
              <Tooltip content="Choose a theme preset that best suits your preferences" position="right">
                <span className="label-text text-base-content/70">Theme preset</span>
              </Tooltip>
            </label>
            <select
              className="select select-bordered select-sm w-full"
              value={ui.theme}
              onChange={(event) => handleThemeSelect(event.target.value as UIState['theme'])}
              aria-label="Select theme preset"
            >
              {themeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            <Tooltip content="Automatically refresh dashboard data at regular intervals" position="right">
              <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text">Auto Refresh</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={ui.autoRefreshEnabled}
                  onChange={handleAutoRefreshToggle}
                  aria-label="Toggle auto refresh"
                />
              </label>
            </Tooltip>
          </div>
          <div className="mt-4 form-control w-full max-w-xs">
            <label className="label">
              <Tooltip content="Set how often the dashboard should refresh automatically" position="right">
                <span className="label-text text-base-content/70">Refresh Interval:</span>
              </Tooltip>
            </label>
            <select
              className="select select-bordered select-sm w-full"
              value={ui.refreshInterval}
              onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
              disabled={!ui.autoRefreshEnabled}
              aria-label="Select refresh interval"
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
            <Tooltip content="Disable animations for reduced motion preferences" position="right">
              <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text">Reduced Motion</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={!ui.animationsEnabled}
                  onChange={(event) => dispatch(setAnimationsEnabled(!event.target.checked))}
                  aria-label="Toggle reduced motion"
                />
              </label>
            </Tooltip>
          </div>
          <div className="form-control">
            <Tooltip content="Display helpful tooltips throughout the interface" position="right">
              <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text">Show Tooltips</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={ui.showTooltips}
                  onChange={(event) => dispatch(setShowTooltips(event.target.checked))}
                  aria-label="Toggle tooltips"
                />
              </label>
            </Tooltip>
          </div>
          <div className="form-control">
            <Tooltip content="Show keyboard shortcuts overlay for quick access" position="right">
              <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text">Keyboard Shortcuts Overlay</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={ui.showKeyboardShortcuts}
                  onChange={(event) => dispatch(setShowKeyboardShortcuts(event.target.checked))}
                  aria-label="Toggle keyboard shortcuts overlay"
                />
              </label>
            </Tooltip>
          </div>
        </div>
      ),
    },
  ];

  const handleThemeToggle = (checked: boolean) => {
    dispatch(setTheme(checked ? 'dark' : 'light'));
  };

  const handleThemeSelect = (mode: UIState['theme']) => {
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
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Settings saved successfully!</span>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Failed to save settings. Please try again.</span>
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
        <Button
          variant="primary"
          onClick={() => hasChanges ? setShowDiffConfirm(true) : handleSaveSettings()}
          disabled={saveStatus === 'saving'}
          loading={saveStatus === 'saving'}
          loadingText="Saving..."
          aria-label="Save Settings"
        >
          Save Settings
        </Button>
        <Tooltip content="Reset all settings to their default values">
          <Button
            buttonStyle="outline"
            variant="secondary"
            onClick={() => window.location.reload()}
            aria-label="Reset to Defaults"
          >
            Reset to Defaults
          </Button>
        </Tooltip>
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
