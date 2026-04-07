import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectTheme,
  selectAnimationsEnabled,
  selectDensity,
  selectHintStyle,
  setTheme,
  setAnimationsEnabled,
  setDensity,
  setHintStyle,
} from '../../store/slices/uiSlice';
import type { UIState } from '../../store/slices/uiSlice';
import AdvancedThemeSwitcher from '../DaisyUI/AdvancedThemeSwitcher';
import Toggle from '../DaisyUI/Toggle';
import { Palette, Sparkles, LayoutGrid, MessageSquare } from 'lucide-react';

const SettingsPreferences: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const animationsEnabled = useAppSelector(selectAnimationsEnabled);
  const density = useAppSelector(selectDensity);
  const hintStyle = useAppSelector(selectHintStyle);

  const handleThemeChange = (newTheme: string) => {
    dispatch(setTheme(newTheme as UIState['theme']));
  };

  const handleAnimationsToggle = (checked: boolean) => {
    dispatch(setAnimationsEnabled(checked));
  };

  const handleDensityChange = (value: UIState['density']) => {
    dispatch(setDensity(value));
  };

  const handleHintStyleChange = (value: UIState['hintStyle']) => {
    dispatch(setHintStyle(value));
  };

  const commonCardClass = 'card bg-base-100 border border-base-300 shadow-sm p-4 h-full';

  const densityOptions: { value: UIState['density']; label: string; description: string }[] = [
    { value: 'compact', label: 'Compact', description: 'Tighter spacing, more content visible' },
    { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing (default)' },
    { value: 'spacious', label: 'Spacious', description: 'More breathing room between elements' },
  ];

  const hintStyleOptions: { value: UIState['hintStyle']; label: string; description: string }[] = [
    { value: 'icon', label: 'Icon Only', description: 'Show only icons for hints' },
    { value: 'text', label: 'Text Only', description: 'Show only text for hints' },
    { value: 'full', label: 'Full', description: 'Show both icon and text (default)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Palette className="w-5 h-5 text-primary" />
        <div>
          <h5 className="text-lg font-bold">Preferences</h5>
          <p className="text-sm text-base-content/70">
            Customize the look and feel of your interface
          </p>
        </div>
      </div>

      {/* Theme Selection */}
      <div className={commonCardClass}>
        <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full"></span>
          Theme Selection
        </h6>
        <AdvancedThemeSwitcher
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          position="inline"
          showPreview={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Animations */}
        <div className={commonCardClass}>
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            Animations
          </h6>
          <Toggle
            label="Enable animations"
            checked={animationsEnabled}
            onChange={handleAnimationsToggle}
            size="sm"
          />
          <p className="text-xs text-base-content/60 mt-2">
            Toggle transition effects and motion throughout the UI. Disabling may improve
            performance on lower-end devices.
          </p>
        </div>

        {/* Display Density */}
        <div className={commonCardClass}>
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-accent" />
            Display Density
          </h6>
          <div className="space-y-2">
            {densityOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                  density === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-base-300 hover:border-primary/50'
                }`}
              >
                <input
                  type="radio"
                  name="density"
                  className="radio radio-primary radio-sm"
                  value={option.value}
                  checked={density === option.value}
                  onChange={() => handleDensityChange(option.value)}
                />
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-base-content/60">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Hint Style */}
        <div className={commonCardClass}>
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-warning" />
            Hint Style
          </h6>
          <div className="space-y-2">
            {hintStyleOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                  hintStyle === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-base-300 hover:border-primary/50'
                }`}
              >
                <input
                  type="radio"
                  name="hintStyle"
                  className="radio radio-primary radio-sm"
                  value={option.value}
                  checked={hintStyle === option.value}
                  onChange={() => handleHintStyleChange(option.value)}
                />
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-base-content/60">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPreferences;
