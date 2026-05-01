import React, { useState, useEffect, useRef, useCallback } from 'react';
import Divider from './Divider';
import Logo from '../Logo';
import Avatar from './Avatar';
import AdvancedThemeSwitcher from './AdvancedThemeSwitcher';
import Indicator from './Indicator';
import Tooltip from './Tooltip';
import Badge from './Badge';
import { useUIStore } from '../../store/uiStore';
import { apiService } from '../../services/api';
import type { Bot } from '../../services/api/types';
import { useSuccessToast, useErrorToast } from './ToastNotification';
import {
  Bell,
  Plus,
  Activity,
  User as UserIcon,
  Search as SearchIcon,
  LogOut,
  HelpCircle,
  Settings as CogIcon,
  FileText,
  Menu,
  X,
  Bot as BotIcon,
  Terminal,
  Play,
  Square,
  SearchCode,
  Rows2,
  Rows3,
  Rows4,
  ShieldAlert,
} from 'lucide-react';

type Density = 'compact' | 'comfortable' | 'spacious';

const DENSITY_ORDER: Density[] = ['compact', 'comfortable', 'spacious'];

const DENSITY_META: Record<Density, { label: string; icon: typeof Rows2; description: string }> = {
  compact:    { label: 'Compact',    icon: Rows4, description: 'Tighter spacing, more content per screen' },
  comfortable:{ label: 'Comfortable',icon: Rows3, description: 'Balanced spacing (default)' },
  spacious:   { label: 'Spacious',   icon: Rows2, description: 'Generous spacing, easier to scan' },
};

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
  children?: Omit<NavItem, 'children'>[];
}

interface NavbarWithSearchProps {
  title?: string;
  navItems?: NavItem[];
  onSearch?: (query: string) => void;
  onNotificationClick?: () => void;
  notificationCount?: number;
  userName?: string;
  userAvatar?: string;
  currentPath?: string;
  searchSuggestions?: string[];
  searchCategories?: string[];
}

const NavbarWithSearch: React.FC<NavbarWithSearchProps> = ({
  title: _title = 'Open-Hivemind',
  navItems = [],
  onSearch,
  onNotificationClick,
  notificationCount = 0,
  userName = 'Admin',
  userAvatar,
  currentPath = '/',
  searchSuggestions = [],
  searchCategories = ['bots', 'configs', 'logs', 'users', 'settings'],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isCommandMode, setIsCommandMode] = useState(false);
  const [isPanicMode, setIsPanicMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const handleTogglePanicMode = async () => {
    try {
      const response: any = await apiService.post('/api/admin/panic-mode');
      if (response.success) {
        const enabled = response.data.enabled;
        setIsPanicMode(enabled);
        if (enabled) {
           errorToast('KILL SWITCH ACTIVATED', 'All bot messages are now being rejected globally.');
        } else {
           successToast('Kill Switch Deactivated', 'Bot message processing resumed.');
        }
      }
    } catch (e: any) {
      errorToast('Action Failed', e.message || 'Failed to toggle Panic Mode');
    }
  };

  const _handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  useEffect(() => {
    const storedSearches = localStorage.getItem('recentSearches');
    if (storedSearches) {
      setRecentSearches(JSON.parse(storedSearches));
    }

    // Fetch bots for command palette
    const fetchBots = async () => {
      try {
        const fetchedBots = await apiService.getBots();
        setBots(fetchedBots);
      } catch (err) {
        console.error('Failed to fetch bots for omnibar:', err);
      }
    };
    fetchBots();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.startsWith('>')) {
      setIsCommandMode(true);
      const commandQuery = query.slice(1).trim().toLowerCase();
      
      const commands: string[] = [];
      bots.forEach(bot => {
        commands.push(`> Start ${bot.name}`);
        commands.push(`> Stop ${bot.name}`);
        commands.push(`> Diagnose ${bot.name}`);
      });

      const filtered = commands.filter(c => 
        c.toLowerCase().includes(query.toLowerCase())
      );
      
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setIsCommandMode(false);
      if (query) {
        const suggestions = [
          ...searchSuggestions,
          ...searchCategories.map(cat => `${cat}:`),
        ].filter(s => s.toLowerCase().includes(query.toLowerCase()));
        setFilteredSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const handleSearchSubmitWithOptions = async (query: string) => {
    if (query.trim()) {
      if (query.startsWith('>')) {
        const command = query.slice(1).trim();
        const parts = command.split(' ');
        const action = parts[0].toLowerCase();
        const botName = parts.slice(1).join(' ');

        const bot = bots.find(b => b.name === botName);
        if (!bot) {
          errorToast('Command Error', `Bot "${botName}" not found.`);
          return;
        }

        try {
          if (action === 'start') {
            await apiService.startBot(bot.id);
            successToast('Bot Started', `${bot.name} is now running.`);
          } else if (action === 'stop') {
            await apiService.stopBot(bot.id);
            successToast('Bot Stopped', `${bot.name} has been stopped.`);
          } else if (action === 'diagnose') {
            await apiService.get(`/api/bots/${bot.id}/diagnose`);
            successToast('Diagnostic Started', `Running health check for ${bot.name}.`);
          } else {
            errorToast('Unknown Command', `Action "${action}" is not recognized.`);
          }
        } catch (err: any) {
          errorToast('Action Failed', err.message || `Failed to ${action} ${bot.name}`);
        }
        
        setSearchQuery('');
        setShowSuggestions(false);
        return;
      }

      const updatedSearches = [query.trim(), ...recentSearches.filter(s => s !== query.trim())].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
      if (onSearch) {
        onSearch(query.trim());
      }
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSearchSubmitWithOptions(filteredSuggestions[selectedSuggestionIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const handleFocus = () => {
    setIsSearchFocused(true);
    if (searchQuery) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsSearchFocused(false);
    // Delay hiding suggestions to allow click events on them
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 200);
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleUseHotKey = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleUseHotKey);
    return () => {
      window.removeEventListener('keydown', handleUseHotKey);
    };
  }, [handleUseHotKey]);

  const themeOptions = [
    { value: 'light', label: 'Light', emoji: '☀️' },
    { value: 'dark', label: 'Dark', emoji: '🌙' },
    { value: 'cupcake', label: 'Cupcake', emoji: '🧁' },
    { value: 'cyberpunk', label: 'Cyberpunk', emoji: '🌆' },
    { value: 'synthwave', label: 'Synthwave', emoji: '🌸' },
    { value: 'dracula', label: 'Dracula', emoji: '🧛' },
    { value: 'forest', label: 'Forest', emoji: '🌲' },
    { value: 'aqua', label: 'Aqua', emoji: '💧' },
    { value: 'corporate', label: 'Corporate', emoji: '🏢' },
    { value: 'retro', label: 'Retro', emoji: '📺' },
  ];

  const uiTheme = useUIStore((s) => s.theme);
  const setUiTheme = useUIStore((s) => s.setTheme);

  const density = useUIStore((s) => s.density);
  const setDensity = useUIStore((s) => s.setDensity);

  const densityMeta = DENSITY_META[density];
  const DensityIcon = densityMeta.icon;
  const nextDensity = DENSITY_ORDER[(DENSITY_ORDER.indexOf(density) + 1) % DENSITY_ORDER.length];
  const nextDensityMeta = DENSITY_META[nextDensity];
  const cycleDensity = () => {
    setDensity(nextDensity);
  };

  return (
    <>
      {isPanicMode && (
        <div className="bg-error text-error-content px-4 py-2 text-center text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse shadow-inner">
          <ShieldAlert className="w-4 h-4" />
          SYSTEM PANIC MODE ACTIVE: ALL BOT MESSAGES REJECTED
          <ShieldAlert className="w-4 h-4" />
        </div>
      )}
    <nav className="navbar bg-base-100 shadow-lg border-b border-base-200 px-4" aria-label="Main navigation">
      {/* Navbar Start */}
      <div className="navbar-start gap-2">
        {/* Mobile Menu */}
        <div className="dropdown lg:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle" aria-label="Open mobile menu">
            <Menu className="w-5 h-5" />
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[30] p-2 shadow-xl bg-base-100 rounded-box w-64 border border-base-200">
            {navItems.map((item) => (
              <li key={item.id}>
                <a href={item.path} className={currentPath === item.path ? 'active font-bold' : ''}>
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                  {item.badge && <Badge size="sm" variant="primary">{item.badge}</Badge>}
                </a>
                {item.children && (
                  <ul className="p-2 border-l border-base-300 ml-4">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <a href={child.path} className={currentPath === child.path ? 'active' : ''}>
                          <span>{child.icon}</span>
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Logo and Title */}
        <a href="/" className="btn btn-ghost px-2 hover:bg-transparent flex gap-2">
          <Logo size="sm" />
          <span className="hidden sm:inline font-bold tracking-tight">Open-Hivemind</span>
        </a>
      </div>

      {/* Navbar Center - Search */}
      <div className="navbar-center hidden lg:flex flex-1 justify-center max-w-xl">
        <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmitWithOptions(searchQuery); }} className="w-full relative" role="search" aria-label="Site search">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isCommandMode ? (
                <Terminal className="w-4 h-4 text-primary animate-pulse" />
              ) : (
                <SearchIcon className={`w-4 h-4 transition-colors ${isSearchFocused ? 'text-primary' : 'text-base-content/40'}`} />
              )}
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isCommandMode ? "Enter command (e.g. > Start BotName)" : "Search features, bots, or configs... (Ctrl+K)"}
              className={`input input-bordered w-full pl-10 pr-10 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all duration-300 ${isSearchFocused ? 'shadow-inner' : ''} ${isCommandMode ? 'border-primary/50' : ''}`}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded={showSuggestions}
              aria-autocomplete="list"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute inset-y-0 right-10 pr-2 flex items-center opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                  setIsCommandMode(false);
                  searchInputRef.current?.focus();
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
               <span className="text-[10px] font-bold opacity-30 bg-base-300 px-1 rounded">{isCommandMode ? 'CMD' : '⌘K'}</span>
            </div>
          </div>

          {/* Search Suggestions Dropdown */}
          {showSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute top-full mt-2 w-full bg-base-100 rounded-box shadow-2xl border border-base-300 z-50 max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-200" role="listbox"
            >
              {searchQuery && filteredSuggestions.length > 0 && (
                <div className="p-2">
                  <h3 className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest px-3 py-2">
                    {isCommandMode ? 'Action Commands' : 'Quick Results'}
                  </h3>
                  <ul>
                    {filteredSuggestions.map((suggestion, index) => {
                      const isAction = suggestion.startsWith('>');
                      let Icon = SearchIcon;
                      if (isAction) {
                        if (suggestion.includes('Start')) Icon = Play;
                        else if (suggestion.includes('Stop')) Icon = Square;
                        else if (suggestion.includes('Diagnose')) Icon = SearchCode;
                      }

                      return (
                        <li key={index}>
                          <button
                            className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-base-200 transition-colors flex items-center gap-3 ${selectedSuggestionIndex === index ? 'bg-primary/10 text-primary font-medium' : ''
                              }`}
                            onClick={() => handleSearchSubmitWithOptions(suggestion)}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                          >
                            <Icon className={`w-3.5 h-3.5 ${isAction ? 'text-primary' : 'opacity-40'}`} />
                            <span className="text-sm">{suggestion}</span>
                            {isAction && (
                              <Badge size="xs" variant="outline" className="ml-auto text-[8px] opacity-50 uppercase">Bot Action</Badge>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {recentSearches.length > 0 && (
                <div className="p-2 border-t border-base-200">
                  <div className="flex justify-between items-center px-3 py-2">
                    <h3 className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">Recently Searched</h3>
                    <button
                      className="text-[10px] font-bold text-error/60 hover:text-error transition-colors"
                      onClick={handleClearRecentSearches}
                    >
                      CLEAR ALL
                    </button>
                  </div>
                  <ul>
                    {recentSearches.map((search, index) => (
                      <li key={index}>
                        <button
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-base-200 transition-colors flex items-center justify-between group"
                          onClick={() => handleSearchSubmitWithOptions(search)}
                        >
                          <div className="flex items-center gap-3">
                            <Activity className="w-3.5 h-3.5 opacity-30" />
                            <span className="text-sm">{search}</span>
                          </div>
                          <span className="text-[10px] opacity-0 group-hover:opacity-40 transition-opacity">Select ↵</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Navbar End */}
      <div className="navbar-end gap-1 sm:gap-3">
        {/* Kill Switch */}
        <Tooltip content={isPanicMode ? "Deactivate Kill Switch" : "Global Kill Switch (PANIC)"} position="bottom">
          <button 
            className={`btn btn-sm btn-circle ${isPanicMode ? 'btn-error animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.8)]' : 'btn-ghost text-error/60 hover:bg-error hover:text-error-content'}`}
            onClick={handleTogglePanicMode}
            aria-label="Toggle Global Kill Switch"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Quick Actions */}
        <div className="hidden md:flex">
          <Tooltip content="Create New Bot" position="bottom">
            <button className="btn btn-ghost btn-circle btn-sm" aria-label="Create New Bot">
              <Plus className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>

        {/* System Status Indicator */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm" aria-label="System status">
            <Indicator
               item={<span className="badge badge-xs badge-success indicator-item"></span>}
               className="p-1"
            >
               <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            </Indicator>
          </div>
          <ul tabIndex={0} className="dropdown-content z-[40] menu p-3 shadow-2xl bg-base-100 rounded-box w-64 border border-base-200 mt-2">
            <li className="menu-title text-xs opacity-40 uppercase tracking-widest font-bold mb-2">Live Infrastructure</li>
            <li><a className="flex justify-between py-2 font-medium"><span>🟢 System Status</span> <Badge variant="success" size="xs">Healthy</Badge></a></li>
            <li><a className="flex justify-between py-2"><span>🤖 Active Bots</span> <span className="font-mono text-xs">3</span></a></li>
            <li><a className="flex justify-between py-2"><span>📡 MCP Nodes</span> <span className="font-mono text-xs">5</span></a></li>
            <Divider className="my-1" />
            <li><a href="/admin/monitoring" className="btn btn-xs btn-primary btn-outline mt-2">View Health Dashboard</a></li>
          </ul>
        </div>

        {/* Notifications */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm" onClick={onNotificationClick} aria-label={`Notifications, ${notificationCount} unread`}>
            <Indicator
              item={notificationCount > 0 ? <Badge size="xs" variant="primary" className="indicator-item border-none text-[8px] h-3.5 min-w-[14px]">{notificationCount}</Badge> : null}
            >
              <Bell className="w-5 h-5 opacity-70" />
            </Indicator>
          </div>
          <ul tabIndex={0} className="dropdown-content z-[40] menu p-2 shadow-2xl bg-base-100 rounded-box w-80 border border-base-200 mt-2">
            <li className="menu-title text-xs font-bold uppercase tracking-widest p-3">Recent Alerts</li>
            <div className="max-h-60 overflow-y-auto">
               <li><a className="py-3 items-start gap-3 border-b border-base-200 rounded-none">
                  <div className="bg-primary/10 text-primary p-2 rounded-lg"><BotIcon className="w-4 h-4" /></div>
                  <div className="flex flex-col">
                     <span className="text-xs font-bold">Bot "Assistant" reconnected</span>
                     <span className="text-[10px] opacity-40">2 minutes ago</span>
                  </div>
               </a></li>
               <li><a className="py-3 items-start gap-3 border-b border-base-200 rounded-none">
                  <div className="bg-warning/10 text-warning p-2 rounded-lg"><Activity className="w-4 h-4" /></div>
                  <div className="flex flex-col">
                     <span className="text-xs font-bold">High memory usage detected</span>
                     <span className="text-[10px] opacity-40">15 minutes ago</span>
                  </div>
               </a></li>
            </div>
            <li><a href="/admin/monitoring" className="text-center font-bold text-primary text-xs py-3">View All Notifications</a></li>
          </ul>
        </div>

        <Divider vertical className="h-6 mx-0 hidden sm:flex" />

        {/* Density Quick Toggle — cycles compact -> comfortable -> spacious. Same store as Settings page slider. */}
        <Tooltip
          content={`Density: ${densityMeta.label}. Click to cycle to ${nextDensityMeta.label}.`}
          position="bottom"
        >
          <button
            type="button"
            className="btn btn-ghost btn-circle btn-sm hidden sm:inline-flex"
            onClick={cycleDensity}
            aria-label={`UI density: ${densityMeta.label}. Activate to switch density.`}
          >
            <DensityIcon className="w-5 h-5" />
          </button>
        </Tooltip>
        {/* Polite live region: announces the new density value to screen readers when state changes. */}
        <span aria-live="polite" aria-atomic="true" className="sr-only">{`Density: ${densityMeta.label}`}</span>

        {/* Improved Theme Switcher integration */}
        <div className="hidden sm:flex">
          <AdvancedThemeSwitcher
            currentTheme={uiTheme}
            onThemeChange={setUiTheme}
            position="dropdown"
          />
        </div>

        {/* User Menu */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar ml-1" aria-label="User menu">
            <div className="w-8 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden shadow-md">
               <Avatar
                size="sm"
                shape="circle"
                src={userAvatar || undefined}
                placeholder={!userAvatar}
                className="w-full h-full"
                innerClassName={!userAvatar ? "bg-primary text-primary-content flex items-center justify-center font-bold text-xs" : ""}
              >
                {!userAvatar && userName.charAt(0).toUpperCase()}
              </Avatar>
            </div>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[50] p-2 shadow-2xl bg-base-100 rounded-box w-64 border border-base-200">
            <div className="px-4 py-3 border-b border-base-200 mb-2">
               <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-1">Signed in as</p>
               <p className="font-bold text-sm truncate">{userName}</p>
            </div>
            <li><a href="/admin/settings" className="py-2.5"><UserIcon className="w-4 h-4" /> My Profile</a></li>
            <li><a href="/admin/settings" className="py-2.5"><CogIcon className="w-4 h-4" /> System Settings</a></li>
            <Divider className="my-1" />
            <li><a href="https://github.com/matthewhand/open-hivemind" target="_blank" rel="noopener noreferrer" className="py-2.5"><HelpCircle className="w-4 h-4" /> Help & Support</a></li>
            <li><a href="https://github.com/matthewhand/open-hivemind" target="_blank" rel="noopener noreferrer" className="py-2.5"><FileText className="w-4 h-4" /> API Documentation</a></li>
            <li className="mt-2"><a href="/login" className="text-error font-bold hover:bg-error/10 py-2.5"><LogOut className="w-4 h-4" /> Sign out</a></li>
          </ul>
        </div>
      </div>
    </nav>
    </>
    );
    };

    export default NavbarWithSearch;