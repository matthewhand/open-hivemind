import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useUIStore } from '../store/uiStore';
import { Accordion } from './DaisyUI/Accordion';
import type { AccordionItem } from './DaisyUI/Accordion';
import { useConfigDiff } from '../hooks/useConfigDiff';
import { ConfigDiffViewer, ConfigDiffConfirmDialog } from './ConfigDiffViewer';
import AdvancedThemeSwitcher from './DaisyUI/AdvancedThemeSwitcher';
import { Alert } from './DaisyUI/Alert';
import Toggle from './DaisyUI/Toggle';
import { LoadingSpinner } from './DaisyUI/Loading';
import Select from './DaisyUI/Select';
import type { UIState } from '../store/uiStore';

const Settings: React.FC = () => {
  const ui = useUIStore((s) => s);
  const setTheme = useUIStore((s) => s.setTheme);
  const setAnimationsEnabled = useUIStore((s) => s.setAnimationsEnabled);
  const setDisable3dEffects = useUIStore((s) => s.setDisable3dEffects);
  const setCompactDensity = useUIStore((s) => s.setCompactDensity);
  const setShowDescriptions = useUIStore((s) => s.setShowDescriptions);
  const setCardBorderRadius = useUIStore((s) => s.setCardBorderRadius);
  const setRefreshInterval = useUIStore((s) => s.setRefreshInterval);
  const setShowKeyboardShortcuts = useUIStore((s) => s.setShowKeyboardShortcuts);
  const setShowTooltips = useUIStore((s) => s.setShowTooltips);
  const setHintStyle = useUIStore((s) => s.setHintStyle);
  const toggleAutoRefresh = useUIStore((s) => s.toggleAutoRefresh);
  const setDensity = useUIStore((s) => s.setDensity);
  const setSoundEnabled = useUIStore((s) => s.setSoundEnabled);
  const setNotificationsEnabled = useUIStore((s) => s.setNotificationsEnabled);
  const setErrorReportingEnabled = useUIStore((s) => s.setErrorReportingEnabled);
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
    disable3dEffects: ui.disable3dEffects,
    compactDensity: ui.compactDensity,
    showDescriptions: ui.showDescriptions,
    cardBorderRadius: ui.cardBorderRadius,
    showTooltips: ui.showTooltips,
    showKeyboardShortcuts: ui.showKeyboardShortcuts,
    hintStyle: ui.hintStyle,
  }) as Record<string, unknown>, [ui.theme, ui.autoRefreshEnabled, ui.refreshInterval, ui.animationsEnabled, ui.disable3dEffects, ui.compactDensity, ui.showDescriptions, ui.cardBorderRadius, ui.showTooltips, ui.showKeyboardShortcuts, ui.hintStyle]);

  const { hasChanges, diff, setOriginalConfig } = useConfigDiff(settingsAsRecord);

  useEffect(() => {
    if (originalSnapshot) {
      setOriginalConfig(settingsAsRecord);
      setOriginalSnapshot(false);
    }
  }, [originalSnapshot, settingsAsRecord, setOriginalConfig]);

  const accordionItems: AccordionItem[] = [
    {
      id: 'preferences',
      title: 'Preferences',
      icon: '⚙️',
      content: (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Theme Selection</h3>
            <p className="text-sm text-base-content/70 mb-4">Choose a theme to customize your experience.</p>
            <AdvancedThemeSwitcher
              currentTheme={ui.theme}
              onThemeChange={handleThemeSelect}
              position="inline"
            />
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">UI Preferences</h3>
            <p className="text-sm text-base-content/70 mb-4">Customize the user interface behavior.</p>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <span className="label-text">DaisyUI Animations</span>
                  <Toggle
                    color="primary"
                    checked={ui.animationsEnabled}
                    onChange={(event) => setAnimationsEnabled(event.target.checked)}
                  />
                </label>
                <p className="text-xs text-base-content/60 mt-1">Enable smooth transitions and animations for UI elements.</p>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <span className="label-text">Show Tooltips</span>
                  <Toggle
                    color="primary"
                    checked={ui.showTooltips}
                    onChange={(event) => setShowTooltips(event.target.checked)}
                  />
                </label>
                <p className="text-xs text-base-content/60 mt-1">Display helpful tooltips on hover.</p>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <span className="label-text">Keyboard Shortcuts Overlay</span>
                  <Toggle
                    color="primary"
                    checked={ui.showKeyboardShortcuts}
                    onChange={(event) => setShowKeyboardShortcuts(event.target.checked)}
                  />
                </label>
                <p className="text-xs text-base-content/60 mt-1">Show keyboard shortcuts overlay.</p>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Hint & Tip Display Style</span>
                </label>
                <Select
                  className="select-bordered"
                  size="sm"
                  value={ui.hintStyle}
                  onChange={(e) => setHintStyle(e.target.value as UIState['hintStyle'])}
                >
                  <option value="icon">Icon Only (Compact)</option>
                  <option value="text">Icon + Text</option>
                  <option value="full">Full Card (Detailed)</option>
                </Select>
                <p className="text-xs text-base-content/60 mt-1">Control how helpful hints and tips are displayed throughout the UI.</p>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">UI Density</span>
                </label>
                <Select
                  className="select-bordered"
                  size="sm"
                  value={ui.density}
                  onChange={(e) => setDensity(e.target.value as UIState['density'])}
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </Select>
                <p className="text-xs text-base-content/60 mt-1">Adjust the spacing and size of UI elements.</p>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <span className="label-text">Enable Sounds</span>
                  <Toggle
                    color="primary"
                    checked={ui.soundEnabled}
                    onChange={(event) => setSoundEnabled(event.target.checked)}
                  />
                </label>
                <p className="text-xs text-base-content/60 mt-1">Play sounds for notifications and interactions.</p>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <span className="label-text">Enable Notifications</span>
                  <Toggle
                    color="primary"
                    checked={ui.notificationsEnabled}
                    onChange={(event) => setNotificationsEnabled(event.target.checked)}
                  />
                </label>
                <p className="text-xs text-base-content/60 mt-1">Show browser notifications for important events.</p>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <span className="label-text">Error Reporting</span>
                  <Toggle
                    color="primary"
                    checked={ui.errorReportingEnabled}
                    onChange={(event) => setErrorReportingEnabled(event.target.checked)}
                  />
                </label>
                <p className="text-xs text-base-content/60 mt-1">Help improve the application by sending error reports.</p>
              </div>
            </div>
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
                color="primary"
                checked={ui.autoRefreshEnabled}
                onChange={handleAutoRefreshToggle}
              />
            </label>
          </div>
          <div className="mt-4 form-control w-full max-w-xs">
            <label className="label" htmlFor="refresh-interval">
              <span className="label-text text-base-content/70">Refresh Interval:</span>
            </label>
            <Select
              id="refresh-interval"
              className="select-bordered"
              size="sm"
              value={ui.refreshInterval}
              onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
              disabled={!ui.autoRefreshEnabled}
            >
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
            </Select>
          </div>
        </div>
      ),
    },
    {
      id: 'aesthetics',
      title: 'Aesthetics',
      icon: '🖼️',
      content: (
        <div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Reduced Motion</span>
              <Toggle
                color="primary"
                checked={!ui.animationsEnabled}
                onChange={(event) => setAnimationsEnabled(!event.target.checked)}
              />
            </label>
            <p className="text-xs text-base-content/60 mt-1">Disable transitions and animations across the UI.</p>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Disable 3D Hover Effects</span>
              <Toggle
                color="primary"
                checked={ui.disable3dEffects}
                onChange={(event) => setDisable3dEffects(event.target.checked)}
              />
            </label>
            <p className="text-xs text-base-content/60 mt-1">Remove 3D perspective tilt on hover cards.</p>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Compact Density</span>
              <Toggle
                color="primary"
                checked={ui.compactDensity}
                onChange={(event) => setCompactDensity(event.target.checked)}
              />
            </label>
            <p className="text-xs text-base-content/60 mt-1">Reduce card padding and spacing for more content per screen.</p>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Rounded Cards</span>
              <Toggle
                color="primary"
                checked={ui.cardBorderRadius}
                onChange={(event) => setCardBorderRadius(!event.target.checked)}
              />
            </label>
            <p className="text-xs text-base-content/60 mt-1">Toggle between rounded and sharp card corners.</p>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Show Bot Descriptions</span>
              <Toggle
                color="primary"
                checked={ui.showDescriptions}
                onChange={(event) => setShowDescriptions(event.target.checked)}
              />
            </label>
            <p className="text-xs text-base-content/60 mt-1">Hide descriptions for a cleaner, more compact bot grid.</p>
          </div>
        </div>
      ),
    },
  ];

  const handleThemeSelect = (mode: string) => {
    setTheme(mode);
  };

  const handleAutoRefreshToggle = () => {
    toggleAutoRefresh();
  };

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
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
        <Alert status="success" className="mb-6" message="Settings saved successfully!" />
      )}

      <Accordion items={accordionItems} allowMultiple defaultOpenItems={['preferences', 'aesthetics']} />

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
          {saveStatus === 'saving' ? <LoadingSpinner /> : null}
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
