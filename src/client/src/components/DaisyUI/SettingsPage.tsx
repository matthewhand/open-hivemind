/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import Input from './Input';
import { ConfirmModal } from './Modal';
import { useSuccessToast, useErrorToast } from './ToastNotification';

interface ThemeOption {
  value: string;
  label: string;
  emoji: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
}

interface UserPreferences {
  theme: string;
  autoTheme: boolean;
  animations: boolean;
  notifications: boolean;
  compactMode: boolean;
  language: string;
  timezone: string;
  refreshInterval: number;
}

interface SettingsPageProps {
  onSettingsChange?: (settings: UserPreferences) => void;
  initialSettings?: Partial<UserPreferences>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  onSettingsChange,
  initialSettings = {},
}) => {
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [settings, setSettings] = useState<UserPreferences>({
    theme: 'dark',
    autoTheme: false,
    animations: true,
    notifications: true,
    compactMode: false,
    language: 'en',
    timezone: 'UTC',
    refreshInterval: 30,
    ...initialSettings,
  });

  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const themeOptions: ThemeOption[] = [
    {
      value: 'light',
      label: 'Light',
      emoji: '☀️',
      description: 'Clean and bright interface',
      primary: '#570df8',
      secondary: '#f000b8',
      accent: '#37cdbe',
    },
    {
      value: 'dark',
      label: 'Dark',
      emoji: '🌙',
      description: 'Easy on the eyes',
      primary: '#661ae6',
      secondary: '#d926aa',
      accent: '#1fb2a5',
    },
    {
      value: 'cyberpunk',
      label: 'Cyberpunk',
      emoji: '🌆',
      description: 'Neon futuristic vibes',
      primary: '#ff7598',
      secondary: '#75d1f0',
      accent: '#c7f59b',
    },
    {
      value: 'synthwave',
      label: 'Synthwave',
      emoji: '🌸',
      description: 'Retro 80s aesthetic',
      primary: '#e779c1',
      secondary: '#58c7f3',
      accent: '#f3cc30',
    },
    {
      value: 'dracula',
      label: 'Dracula',
      emoji: '🧛',
      description: 'Dark with vibrant colors',
      primary: '#ff79c6',
      secondary: '#bd93f9',
      accent: '#ffb86c',
    },
    {
      value: 'forest',
      label: 'Forest',
      emoji: '🌲',
      description: 'Natural green tones',
      primary: '#1eb854',
      secondary: '#1fd65f',
      accent: '#1db584',
    },
    {
      value: 'aqua',
      label: 'Aqua',
      emoji: '💧',
      description: 'Cool blue palette',
      primary: '#09ecf3',
      secondary: '#966fb3',
      accent: '#ffe999',
    },
    {
      value: 'corporate',
      label: 'Corporate',
      emoji: '🏢',
      description: 'Professional business look',
      primary: '#4f46e5',
      secondary: '#7c3aed',
      accent: '#0891b2',
    },
    {
      value: 'retro',
      label: 'Retro',
      emoji: '📺',
      description: 'Vintage computing style',
      primary: '#ef4444',
      secondary: '#f97316',
      accent: '#eab308',
    },
    {
      value: 'valentine',
      label: 'Valentine',
      emoji: '💖',
      description: 'Romantic pink theme',
      primary: '#e91e63',
      secondary: '#a855f7',
      accent: '#3b82f6',
    },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '中文' },
    { value: 'ru', label: 'Русский' },
  ];

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Australia/Sydney', label: 'Sydney' },
  ];

  useEffect(() => {
    // Apply theme to document
    const currentTheme = previewTheme || settings.theme;
    document.documentElement.setAttribute('data-theme', currentTheme);

    // Save to localStorage
    if (!previewTheme) {
      localStorage.setItem('hivemind-settings', JSON.stringify(settings));
    }
  }, [settings, previewTheme]);

  useEffect(() => {
    // Load saved settings from localStorage
    const saved = localStorage.getItem('hivemind-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...settings, ...parsedSettings });
      } catch (error) {
        console.warn('Failed to load saved settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Auto theme detection
    if (settings.autoTheme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        updateSetting('theme', e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      // Set initial theme
      updateSetting('theme', mediaQuery.matches ? 'dark' : 'light');

      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.autoTheme]);

  const updateSetting = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleThemePreview = (themeValue: string) => {
    setPreviewTheme(themeValue);
    document.documentElement.setAttribute('data-theme', themeValue);
  };

  const applyThemePreview = () => {
    if (previewTheme) {
      updateSetting('theme', previewTheme);
      setPreviewTheme(null);
    }
  };

  const cancelThemePreview = () => {
    setPreviewTheme(null);
    document.documentElement.setAttribute('data-theme', settings.theme);
  };

  const resetToDefaults = () => {
    const defaultSettings: UserPreferences = {
      theme: 'dark',
      autoTheme: false,
      animations: true,
      notifications: true,
      compactMode: false,
      language: 'en',
      timezone: 'UTC',
      refreshInterval: 30,
    };
    setSettings(defaultSettings);
    onSettingsChange?.(defaultSettings);
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hivemind-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings({ ...settings, ...imported });
          onSettingsChange?.({ ...settings, ...imported });
          successToast('Settings Imported', 'Your settings have been successfully imported.');
        } catch (error) {
          errorToast('Import Failed', 'Invalid settings file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="hero bg-base-100 rounded-box shadow-xl mb-6">
          <div className="hero-content text-center py-12">
            <div className="max-w-md">
              <h1 className="text-5xl font-bold">⚙️ Settings</h1>
              <p className="py-6 text-lg">
                Customize your Open-Hivemind experience with themes, preferences, and advanced options.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Theme Settings */}
          <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">🎨 Theme & Appearance</h2>

                {/* Auto Theme Toggle */}
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">🌗 Auto Theme (System Preference)</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={settings.autoTheme}
                      onChange={(e) => updateSetting('autoTheme', e.target.checked)}
                    />
                  </label>
                </div>

                {/* Theme Grid */}
                {!settings.autoTheme && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
                    {themeOptions.map((theme) => (
                      <div key={theme.value} className="relative">
                        <input
                          type="radio"
                          name="theme-selector"
                          value={theme.value}
                          className="sr-only"
                          checked={settings.theme === theme.value}
                          onChange={(e) => updateSetting('theme', e.target.value)}
                        />
                        <div
                          className={`cursor-pointer rounded-lg p-3 border-2 transition-all hover:scale-105 ${
                            (previewTheme || settings.theme) === theme.value
                              ? 'border-primary shadow-lg'
                              : 'border-base-300 hover:border-primary/50'
                          }`}
                          onClick={() => handleThemePreview(theme.value)}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-1">{theme.emoji}</div>
                            <div className="font-semibold text-xs">{theme.label}</div>
                            <div className="flex justify-center gap-1 mt-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: theme.primary }}
                              />
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: theme.secondary }}
                              />
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: theme.accent }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Theme Preview Actions */}
                {previewTheme && (
                  <div className="alert alert-info mt-4">
                    <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Previewing theme: {themeOptions.find(t => t.value === previewTheme)?.label}</span>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-success" onClick={applyThemePreview}>
                        Apply
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={cancelThemePreview}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* UI Preferences */}
                <div className="divider">UI Preferences</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">✨ Animations</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-secondary"
                        checked={settings.animations}
                        onChange={(e) => updateSetting('animations', e.target.checked)}
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">🔔 Notifications</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-accent"
                        checked={settings.notifications}
                        onChange={(e) => updateSetting('notifications', e.target.checked)}
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">📏 Compact Mode</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={settings.compactMode}
                        onChange={(e) => updateSetting('compactMode', e.target.checked)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Live Preview */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-4">
                <h3 className="card-title text-lg">🔍 Live Preview</h3>
                <div className="space-y-2">
                  <div className="stats stats-vertical shadow">
                    <div className="stat">
                      <div className="stat-title">Current Theme</div>
                      <div className="stat-value text-primary">
                        {themeOptions.find(t => t.value === (previewTheme || settings.theme))?.emoji}
                      </div>
                      <div className="stat-desc">
                        {themeOptions.find(t => t.value === (previewTheme || settings.theme))?.label}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm flex-1">Primary</button>
                    <button className="btn btn-secondary btn-sm flex-1">Secondary</button>
                  </div>

                  <div className="alert alert-success">
                    <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Theme applied successfully!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Settings */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-4">
                <h3 className="card-title text-lg">⚡ Quick Settings</h3>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">🌍 Language</span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={settings.language}
                    onChange={(e) => updateSetting('language', e.target.value)}
                  >
                    {languageOptions.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">🕐 Timezone</span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={settings.timezone}
                    onChange={(e) => updateSetting('timezone', e.target.value)}
                  >
                    {timezoneOptions.map(tz => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">🔄 Refresh Interval (seconds)</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="300"
                    value={settings.refreshInterval}
                    className="range range-primary range-sm"
                    step="5"
                    onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                  />
                  <div className="w-full flex justify-between text-xs px-2">
                    <span>5s</span>
                    <span>{settings.refreshInterval}s</span>
                    <span>5m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-xl">🔧 Advanced Settings</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? '▼' : '▶'} {showAdvanced ? 'Hide' : 'Show'}
              </button>
            </div>

            {showAdvanced && (
              <div className="mt-4 space-y-6">
                {/* Data Management */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">💾 Data Management</h3>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-outline btn-sm" onClick={exportSettings}>
                      📤 Export Settings
                    </button>

                    <label className="btn btn-outline btn-sm">
                      📥 Import Settings
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={importSettings}
                      />
                    </label>

                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => setShowResetConfirm(true)}
                      data-testid="reset-button"
                    >
                      🔄 Reset to Defaults
                    </button>
                  </div>
                </div>

                {/* Developer Options */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">👨‍💻 Developer Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label cursor-pointer">
                        <span className="label-text">🐛 Debug Mode</span>
                        <input type="checkbox" className="toggle toggle-error" />
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer">
                        <span className="label-text">📊 Performance Monitoring</span>
                        <input type="checkbox" className="toggle toggle-info" />
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer">
                        <span className="label-text">🔍 Verbose Logging</span>
                        <input type="checkbox" className="toggle toggle-warning" />
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer">
                        <span className="label-text">⚡ Experimental Features</span>
                        <input type="checkbox" className="toggle toggle-success" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Current Settings JSON */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">🔍 Current Configuration</h3>
                  <div className="mockup-code">
                    <pre data-prefix="$" className="text-success">
                      <code>cat hivemind-settings.json</code>
                    </pre>
                    <pre className="text-sm">
                      <code>{JSON.stringify(settings, null, 2)}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="text-center mt-8">
          <div className="btn-group">
            <button className="btn" onClick={() => window.history.back()}>
              ← Back to Dashboard
            </button>
            <button
              className="btn btn-primary"
              onClick={() => successToast('Settings saved!', 'Your preferences have been updated.')}
              data-testid="save-button"
            >
              💾 Save All Changes
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          resetToDefaults();
          setShowResetConfirm(false);
          successToast('Settings Reset', 'All settings have been restored to default values.');
        }}
        title="Reset Settings"
        message="Are you sure you want to reset all settings to default values? This action cannot be undone."
        confirmText="Reset"
        confirmVariant="warning"
      />
    </div>
  );
};

export default SettingsPage;