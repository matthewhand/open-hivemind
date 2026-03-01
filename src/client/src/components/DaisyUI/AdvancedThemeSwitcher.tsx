import React, { useState, useEffect, useCallback } from 'react';
import { Input } from './index';

interface ThemeOption {
  value: string;
  label: string;
  emoji: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    base100: string;
    base200: string;
    base300: string;
  };
  category: 'light' | 'dark' | 'colorful' | 'minimal';
}

interface ThemeSwitcherProps {
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
  showPreview?: boolean;
  compact?: boolean;
  className?: string;
  position?: 'dropdown' | 'modal' | 'inline';
}

const AdvancedThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme = 'dark',
  onThemeChange,
  showPreview = true,
  compact = false,
  className = '',
  position = 'dropdown',
}) => {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [favoriteThemes, setFavoriteThemes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const themeOptions: ThemeOption[] = [
    {
      value: 'light',
      label: 'Light',
      emoji: '☀️',
      description: 'Clean and bright interface',
      category: 'light',
      colors: {
        primary: '#570df8',
        secondary: '#f000b8',
        accent: '#37cdbe',
        base100: '#ffffff',
        base200: '#f2f2f2',
        base300: '#e5e6e6',
      },
    },
    {
      value: 'dark',
      label: 'Dark',
      emoji: '🌙',
      description: 'Easy on the eyes',
      category: 'dark',
      colors: {
        primary: '#661ae6',
        secondary: '#d926aa',
        accent: '#1fb2a5',
        base100: '#2a303c',
        base200: '#242933',
        base300: '#20252e',
      },
    },
    {
      value: 'cyberpunk',
      label: 'Cyberpunk',
      emoji: '🌆',
      description: 'Neon futuristic vibes',
      category: 'colorful',
      colors: {
        primary: '#ff7598',
        secondary: '#75d1f0',
        accent: '#c7f59b',
        base100: '#0d1117',
        base200: '#161b22',
        base300: '#21262d',
      },
    },
    {
      value: 'synthwave',
      label: 'Synthwave',
      emoji: '🌸',
      description: 'Retro 80s aesthetic',
      category: 'colorful',
      colors: {
        primary: '#e779c1',
        secondary: '#58c7f3',
        accent: '#f3cc30',
        base100: '#1a0b2e',
        base200: '#16213e',
        base300: '#0f3460',
      },
    },
    {
      value: 'dracula',
      label: 'Dracula',
      emoji: '🧛',
      description: 'Dark with vibrant colors',
      category: 'dark',
      colors: {
        primary: '#ff79c6',
        secondary: '#bd93f9',
        accent: '#ffb86c',
        base100: '#282a36',
        base200: '#44475a',
        base300: '#6272a4',
      },
    },
    {
      value: 'forest',
      label: 'Forest',
      emoji: '🌲',
      description: 'Natural green tones',
      category: 'colorful',
      colors: {
        primary: '#1eb854',
        secondary: '#1fd65f',
        accent: '#1db584',
        base100: '#171212',
        base200: '#191a19',
        base300: '#1b1c1b',
      },
    },
    {
      value: 'corporate',
      label: 'Corporate',
      emoji: '🏢',
      description: 'Professional business look',
      category: 'minimal',
      colors: {
        primary: '#4f46e5',
        secondary: '#7c3aed',
        accent: '#0891b2',
        base100: '#ffffff',
        base200: '#f8fafc',
        base300: '#e2e8f0',
      },
    },
    {
      value: 'retro',
      label: 'Retro',
      emoji: '📺',
      description: 'Vintage computing style',
      category: 'colorful',
      colors: {
        primary: '#ef4444',
        secondary: '#f97316',
        accent: '#eab308',
        base100: '#f4f1eb',
        base200: '#ede8dd',
        base300: '#d4c8b8',
      },
    },
    {
      value: 'cupcake',
      label: 'Cupcake',
      emoji: '🧁',
      description: 'Sweet and cheerful',
      category: 'light',
      colors: {
        primary: '#65c3c8',
        secondary: '#ef9fbc',
        accent: '#eeaf3a',
        base100: '#faf7f5',
        base200: '#efeae6',
        base300: '#e7e2df',
      },
    },
    {
      value: 'valentine',
      label: 'Valentine',
      emoji: '💖',
      description: 'Romantic pink theme',
      category: 'colorful',
      colors: {
        primary: '#e91e63',
        secondary: '#a855f7',
        accent: '#3b82f6',
        base100: '#fef7f7',
        base200: '#fce7e7',
        base300: '#f8d7da',
      },
    },
  ];

  const categories = [
    { value: 'all', label: 'All Themes', emoji: '🎨' },
    { value: 'light', label: 'Light Themes', emoji: '☀️' },
    { value: 'dark', label: 'Dark Themes', emoji: '🌙' },
    { value: 'colorful', label: 'Colorful Themes', emoji: '🌈' },
    { value: 'minimal', label: 'Minimal Themes', emoji: '✨' },
  ];

  // Load saved preferences
  useEffect(() => {
    const savedFavorites = localStorage.getItem('hivemind-favorite-themes');
    if (savedFavorites) {
      setFavoriteThemes(JSON.parse(savedFavorites));
    }

    const savedAutoMode = localStorage.getItem('hivemind-auto-theme');
    if (savedAutoMode === 'true') {
      setIsAutoMode(true);
    }
  }, []);

  // Auto theme detection
  useEffect(() => {
    if (isAutoMode) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        applyTheme(newTheme);
      };

      mediaQuery.addEventListener('change', handleChange);

      // Set initial theme
      const initialTheme = mediaQuery.matches ? 'dark' : 'light';
      applyTheme(initialTheme);

      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [isAutoMode]);

  const applyTheme = useCallback((theme: string) => {
    setSelectedTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hivemind-theme', theme);
    onThemeChange?.(theme);
  }, [onThemeChange]);

  const previewThemeChange = (theme: string) => {
    if (showPreview) {
      setPreviewTheme(theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  };

  const confirmThemeChange = (theme: string) => {
    setPreviewTheme(null);
    applyTheme(theme);
  };

  const cancelPreview = () => {
    if (previewTheme) {
      setPreviewTheme(null);
      document.documentElement.setAttribute('data-theme', selectedTheme);
    }
  };

  const toggleFavorite = (theme: string) => {
    const previousFavorites = [...favoriteThemes];
    const newFavorites = favoriteThemes.includes(theme)
      ? favoriteThemes.filter(t => t !== theme)
      : [...favoriteThemes, theme];

    // Optimistically update UI
    setFavoriteThemes(newFavorites);
    try {
      localStorage.setItem('hivemind-favorite-themes', JSON.stringify(newFavorites));
    } catch (e) {
      console.error('Failed to persist favorites, reverting', e);
      setFavoriteThemes(previousFavorites);
    }
  };

  const toggleAutoMode = () => {
    const newAutoMode = !isAutoMode;
    setIsAutoMode(newAutoMode);
    localStorage.setItem('hivemind-auto-theme', newAutoMode.toString());

    if (!newAutoMode) {
      // When disabling auto mode, apply the current theme
      applyTheme(selectedTheme);
    }
  };

  const filteredThemes = themeOptions.filter(theme => {
    const matchesSearch = theme.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      theme.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || theme.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const favoriteThemeOptions = themeOptions.filter(theme => favoriteThemes.includes(theme.value));

  if (position === 'modal') {
    return (
      <>
        <button className="btn btn-ghost btn-circle" onClick={() => (document.getElementById('theme-modal') as HTMLDialogElement)?.showModal()}>
          🎨
        </button>

        <dialog id="theme-modal" className="modal">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">🎨 Choose Your Theme</h3>
            <ThemeGrid />
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </>
    );
  }

  if (position === 'inline') {
    return (
      <div className={`w-full ${className}`}>
        <ThemeGrid />
      </div>
    );
  }

  // Default dropdown position
  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        <div className="indicator">
          🎨
          {previewTheme && <span className="indicator-item badge badge-xs badge-primary"></span>}
        </div>
      </div>

      <div tabIndex={0} className="dropdown-content z-[1] card card-compact w-80 p-2 shadow bg-base-100">
        <div className="card-body">
          <ThemeGrid />
        </div>
      </div>
    </div>
  );

  function ThemeGrid() {
    return (
      <>
        {/* Auto Theme Toggle */}
        <div className="form-control mb-4">
          <label className="label cursor-pointer">
            <span className="label-text">🌗 Auto Theme (System)</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={isAutoMode}
              onChange={toggleAutoMode}
            />
          </label>
        </div>

        {/* Search and Filter */}
        {!compact && (
          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              placeholder="Search themes..."
              size="sm"
              className="flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="select select-bordered select-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Favorite Themes */}
        {favoriteThemes.length > 0 && !compact && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">⭐ Favorites</h4>
            <div className="grid grid-cols-2 gap-2">
              {favoriteThemeOptions.map(theme => (
                <ThemeCard key={`fav-${theme.value}`} theme={theme} isFavorite />
              ))}
            </div>
            <div className="divider"></div>
          </div>
        )}

        {/* Theme Grid */}
        <div className={`grid gap-2 mb-4 ${compact ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {filteredThemes.map(theme => (
            <ThemeCard key={theme.value} theme={theme} />
          ))}
        </div>

        {/* Preview Actions */}
        {previewTheme && (
          <div className="alert alert-info">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Previewing: {themeOptions.find(t => t.value === previewTheme)?.label}</span>
            <div className="flex gap-1">
              <button
                className="btn btn-xs btn-success"
                onClick={() => confirmThemeChange(previewTheme)}
              >
                Apply
              </button>
              <button
                className="btn btn-xs btn-ghost"
                onClick={cancelPreview}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  function ThemeCard({ theme, isFavorite = false }: { theme: ThemeOption; isFavorite?: boolean }) {
    const isSelected = (previewTheme || selectedTheme) === theme.value;
    const isFav = favoriteThemes.includes(theme.value);

    return (
      <div className="relative group">
        <div
          className={`cursor-pointer rounded-lg p-2 border-2 transition-all duration-200 hover:scale-105 ${isSelected
              ? 'border-primary shadow-lg scale-105'
              : 'border-base-300 hover:border-primary/50'
            }`}
          onClick={() => showPreview ? previewThemeChange(theme.value) : confirmThemeChange(theme.value)}
        >
          <div className="text-center">
            <div className="text-lg mb-1">{theme.emoji}</div>
            <div className="font-semibold text-xs">{theme.label}</div>
            {!compact && (
              <div className="text-xs text-base-content/60 mb-1">
                {theme.description}
              </div>
            )}

            {/* Color Palette */}
            <div className="flex justify-center gap-1 mt-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.colors.secondary }}
              />
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.colors.accent }}
              />
            </div>
          </div>
        </div>

        {/* Favorite Button */}
        {!compact && (
          <button
            className={`absolute -top-1 -right-1 btn btn-xs btn-circle transition-opacity ${isFav ? 'text-yellow-500' : 'text-base-content/30'
              } ${isFavorite || 'opacity-0 group-hover:opacity-100'}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(theme.value);
            }}
          >
            ⭐
          </button>
        )}
      </div>
    );
  }
};

export default AdvancedThemeSwitcher;