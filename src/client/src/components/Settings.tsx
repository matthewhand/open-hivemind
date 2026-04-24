import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useUIStore } from '../store/uiStore';
import { useConfigDiff } from '../hooks/useConfigDiff';
import { ConfigDiffViewer, ConfigDiffConfirmDialog } from './ConfigDiffViewer';
import AdvancedThemeSwitcher from './DaisyUI/AdvancedThemeSwitcher';
import { Alert } from './DaisyUI/Alert';
import Toggle from './DaisyUI/Toggle';
import { LoadingSpinner } from './DaisyUI/Loading';
import Select from './DaisyUI/Select';
import Collapse from './DaisyUI/Collapse';
import Swap from './DaisyUI/Swap';
import Kbd from './DaisyUI/Kbd';
import {
  Settings as CogIcon,
  Layout as LayoutIcon,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Zap,
  ZapOff,
} from 'lucide-react';
import type { UIState } from '../store/uiStore';

const Settings: React.FC = () => {
  const ui = useUIStore((s) => s);
  const setTheme = useUIStore((s) => s.setTheme);
  const setAnimationsEnabled = useUIStore((s) => s.setAnimationsEnabled);
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
  const setShowDescriptions = useUIStore((s) => s.setShowDescriptions);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDiffConfirm, setShowDiffConfirm] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState(true);

  const settingsAsRecord = useMemo(
    () =>
      ({
        theme: ui.theme,
        autoRefreshEnabled: ui.autoRefreshEnabled,
        refreshInterval: ui.refreshInterval,
        animationsEnabled: ui.animationsEnabled,
        cardBorderRadius: ui.cardBorderRadius,
        showTooltips: ui.showTooltips,
        showKeyboardShortcuts: ui.showKeyboardShortcuts,
        hintStyle: ui.hintStyle,
        density: ui.density,
        soundEnabled: ui.soundEnabled,
        notificationsEnabled: ui.notificationsEnabled,
        errorReportingEnabled: ui.errorReportingEnabled,
        showDescriptions: ui.showDescriptions,
      }) as Record<string, unknown>,
    [ui]
  );

  const { hasChanges, diff, setOriginalConfig } = useConfigDiff(settingsAsRecord);

  useEffect(() => {
    if (originalSnapshot) {
      setOriginalConfig(settingsAsRecord);
      setOriginalSnapshot(false);
    }
  }, [originalSnapshot, settingsAsRecord, setOriginalConfig]);

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
      setOriginalConfig(settingsAsRecord);
      resetTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <CogIcon className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-base-content">System Settings</h1>
      </div>

      {saveStatus === 'saved' && (
        <Alert status="success" className="mb-6 shadow-sm border-none" message="Settings saved successfully!" />
      )}

      <div className="space-y-4">
        {/* Preferences Section */}
        <Collapse
          title="General Preferences"
          icon={<CogIcon className="w-5 h-5" />}
          variant="arrow"
          defaultOpen
          className="bg-base-200"
        >
          <div className="pt-4 space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <LayoutIcon className="w-4 h-4 text-primary" /> Visual Theme
              </h3>
              <AdvancedThemeSwitcher
                currentTheme={ui.theme}
                onThemeChange={handleThemeSelect}
                position="inline"
              />
            </section>

            <div className="divider opacity-50"></div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <Toggle
                    color="primary"
                    checked={ui.animationsEnabled}
                    onChange={(event) => setAnimationsEnabled(event.target.checked)}
                  />
                  <div className="flex flex-col">
                    <span className="label-text font-bold">UI Animations</span>
                    <span className="text-xs opacity-60">Smooth transitions across the interface</span>
                  </div>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <Toggle
                    color="primary"
                    checked={ui.showTooltips}
                    onChange={(event) => setShowTooltips(event.target.checked)}
                  />
                  <div className="flex flex-col">
                    <span className="label-text font-bold">Show Tooltips</span>
                    <span className="text-xs opacity-60">Helpful info when hovering over buttons</span>
                  </div>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <Toggle
                    color="primary"
                    checked={ui.showKeyboardShortcuts}
                    onChange={(event) => setShowKeyboardShortcuts(event.target.checked)}
                  />
                  <div className="flex flex-col">
                    <span className="label-text font-bold">
                      Keyboard Shortcuts <Kbd size="xs">?</Kbd>
                    </span>
                    <span className="text-xs opacity-60">Overlay showing available key combos</span>
                  </div>
                </label>
              </div>

              <div className="form-control">
                <div className="flex items-center justify-start gap-4">
                  <Swap
                    variant="rotate"
                    checked={ui.soundEnabled}
                    onChange={setSoundEnabled}
                    onContent={<Volume2 className="w-6 h-6 text-primary" />}
                    offContent={<VolumeX className="w-6 h-6 opacity-40" />}
                  />
                  <div className="flex flex-col">
                    <span className="label-text font-bold">System Sounds</span>
                    <span className="text-xs opacity-60">Audio feedback for system events</span>
                  </div>
                </div>
              </div>

              <div className="form-control">
                <div className="flex items-center justify-start gap-4">
                  <Swap
                    variant="rotate"
                    checked={ui.notificationsEnabled}
                    onChange={setNotificationsEnabled}
                    onContent={<Bell className="w-6 h-6 text-secondary" />}
                    offContent={<BellOff className="w-6 h-6 opacity-40" />}
                  />
                  <div className="flex flex-col">
                    <span className="label-text font-bold">Desktop Notifications</span>
                    <span className="text-xs opacity-60">Stay updated when away from this tab</span>
                  </div>
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <Toggle
                    color="primary"
                    checked={ui.errorReportingEnabled}
                    onChange={(event) => setErrorReportingEnabled(event.target.checked)}
                  />
                  <div className="flex flex-col">
                    <span className="label-text font-bold">Error Reporting</span>
                    <span className="text-xs opacity-60">Anonymously report crashes to developers</span>
                  </div>
                </label>
              </div>
            </section>
          </div>
        </Collapse>

        {/* Dashboard Section */}
        <Collapse
          title="Dashboard & Behavior"
          icon={<LayoutIcon className="w-5 h-5" />}
          variant="arrow"
          className="bg-base-200"
        >
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  className="toggle toggle-primary"
                  checked={ui.autoRefreshEnabled}
                  onChange={handleAutoRefreshToggle}
                />
                <div className="flex flex-col">
                  <span className="label-text font-bold">Live Data Refresh</span>
                  <span className="text-xs opacity-60">Automatically fetch new system metrics</span>
                </div>
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold">Refresh Frequency</span>
              </label>
              <Select
                className="select-bordered w-full"
                size="sm"
                value={ui.refreshInterval}
                onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                disabled={!ui.autoRefreshEnabled}
                options={[
                  { label: '1 second (Real-time)', value: 1000 },
                  { label: '5 seconds', value: 5000 },
                  { label: '10 seconds', value: 10000 },
                  { label: '30 seconds', value: 30000 },
                  { label: '1 minute (Eco)', value: 60000 },
                ]}
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold">UI Density</span>
              </label>
              <Select
                className="select-bordered w-full"
                size="sm"
                value={ui.density}
                onChange={(e) => setDensity(e.target.value as UIState['density'])}
                options={[
                  { label: 'Compact (Maximum info)', value: 'compact' },
                  { label: 'Comfortable (Standard)', value: 'comfortable' },
                  { label: 'Spacious (Clean look)', value: 'spacious' },
                ]}
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold">Hint Style</span>
              </label>
              <Select
                className="select-bordered w-full"
                size="sm"
                value={ui.hintStyle}
                onChange={(e) => setHintStyle(e.target.value as UIState['hintStyle'])}
                options={[
                  { label: 'Icon Only', value: 'icon' },
                  { label: 'Icon + Text', value: 'text' },
                  { label: 'Full Information Card', value: 'full' },
                ]}
              />
            </div>
          </div>
        </Collapse>

        {/* Aesthetics Section */}
        <Collapse
          title="Aesthetics & Cards"
          icon={<Eye className="w-5 h-5" />}
          variant="arrow"
          className="bg-base-200"
        >
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <div className="flex items-center gap-4">
                  <Swap
                    variant="flip"
                    checked={ui.cardBorderRadius}
                    onChange={setCardBorderRadius}
                    onContent={<Zap className="w-6 h-6 text-warning" />}
                    offContent={<ZapOff className="w-6 h-6 opacity-40" />}
                  />
                  <div className="flex flex-col">
                    <span className="label-text font-bold">Rounded UI</span>
                    <span className="text-xs opacity-60">Use soft rounded corners for cards</span>
                  </div>
                </div>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <div className="flex items-center gap-4">
                  <Swap
                    variant="flip"
                    checked={ui.showDescriptions}
                    onChange={setShowDescriptions}
                    onContent={<Eye className="w-6 h-6 text-info" />}
                    offContent={<EyeOff className="w-6 h-6 opacity-40" />}
                  />
                  <div className="flex flex-col">
                    <span className="label-text font-bold">Bot Descriptions</span>
                    <span className="text-xs opacity-60">Show details in the bot management grid</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </Collapse>
      </div>

      {hasChanges && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h3 className="text-sm font-semibold opacity-70 mb-3 uppercase tracking-widest">
            Pending Configuration Changes
          </h3>
          <ConfigDiffViewer diff={diff} mode="unified" maxHeight="12rem" className="shadow-inner rounded-box overflow-hidden" />
        </div>
      )}

      <div className="flex gap-4 mt-10">
        <button
          className="btn btn-primary px-8"
          onClick={() => (hasChanges ? setShowDiffConfirm(true) : handleSaveSettings())}
          disabled={saveStatus === 'saving'}
          aria-label="Save Settings"
        >
          {saveStatus === 'saving' ? <LoadingSpinner size="sm" /> : null}
          {saveStatus === 'saving' ? 'Applying...' : 'Save Configuration'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => window.location.reload()}
          aria-label="Reset to Defaults"
        >
          Reset to Defaults
        </button>
      </div>

      <ConfigDiffConfirmDialog
        isOpen={showDiffConfirm}
        diff={diff}
        onConfirm={() => {
          setShowDiffConfirm(false);
          handleSaveSettings();
        }}
        onCancel={() => setShowDiffConfirm(false)}
        title="Apply Settings Changes?"
        loading={saveStatus === 'saving'}
      />
    </div>
  );
};

export default Settings;
