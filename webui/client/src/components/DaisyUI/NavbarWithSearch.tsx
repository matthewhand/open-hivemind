import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  title = "Open-Hivemind",
  navItems = [],
  onSearch,
  onNotificationClick,
  notificationCount = 0,
  userName = "Admin",
  userAvatar,
  currentPath = "/",
  searchSuggestions = [],
  searchCategories = ['bots', 'configs', 'logs', 'users', 'settings']
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedSearches = localStorage.getItem('recentSearches');
    if (storedSearches) {
      setRecentSearches(JSON.parse(storedSearches));
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
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
  };

  const handleSearchSubmitWithOptions = (query: string) => {
    if (query.trim()) {
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
    { value: 'retro', label: 'Retro', emoji: '📺' }
  ];

  return (
    <div className="navbar bg-base-100 shadow-lg border-b border-base-200">
      {/* Navbar Start */}
      <div className="navbar-start">
        {/* Mobile Menu */}
        <div className="dropdown lg:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            {navItems.map((item) => (
              <li key={item.id}>
                <a href={item.path} className={currentPath === item.path ? 'active' : ''}>
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                  {item.badge && <div className="badge badge-sm badge-primary">{item.badge}</div>}
                </a>
                {item.children && (
                  <ul className="p-2">
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
        <a href="/" className="btn btn-ghost text-xl">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-8">
              <span className="text-sm">🤖</span>
            </div>
          </div>
          <span className="font-bold">{title}</span>
        </a>

        {/* Desktop Menu */}
        <div className="hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            {navItems.slice(0, 5).map((item) => (
              <li key={item.id}>
                {item.children ? (
                  <details>
                    <summary className={currentPath.startsWith(item.path) ? 'active' : ''}>
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                      {item.badge && <div className="badge badge-sm badge-primary">{item.badge}</div>}
                    </summary>
                    <ul className="p-2 bg-base-100 rounded-t-none z-10">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <a href={child.path} className={currentPath === child.path ? 'active' : ''}>
                            <span>{child.icon}</span>
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <a href={item.path} className={currentPath === item.path ? 'active' : ''}>
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                    {item.badge && <div className="badge badge-sm badge-primary">{item.badge}</div>}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Navbar Center - Search */}
      <div className="navbar-center hidden lg:flex">
        <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmitWithOptions(searchQuery); }} className="form-control relative">
          <div className={`input-group ${isSearchFocused ? 'input-group-lg' : ''}`}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search... (Ctrl+K)"
              className={`input input-bordered ${isSearchFocused ? 'input-lg w-96' : 'w-64'} transition-all duration-300 ease-in-out`}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-ghost btn-square"
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                  searchInputRef.current?.focus();
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
            <button type="submit" className="btn btn-square btn-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </button>
          </div>
          
          {/* Search Suggestions Dropdown */}
          {showSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute top-full mt-2 w-full bg-base-100 rounded-box shadow-xl border border-base-300 z-30 max-h-80 overflow-y-auto"
            >
              {searchQuery && filteredSuggestions.length > 0 && (
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-base-content/70 uppercase tracking-wide px-3 py-2">Suggestions</h3>
                  <ul>
                    {filteredSuggestions.map((suggestion, index) => (
                      <li key={index}>
                        <button
                          className={`w-full text-left px-3 py-2 rounded-lg hover:bg-base-200 transition-colors ${
                            selectedSuggestionIndex === index ? 'bg-primary text-primary-content' : ''
                          }`}
                          onClick={() => handleSearchSubmitWithOptions(suggestion)}
                          onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <span>{suggestion}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {recentSearches.length > 0 && (
                <div className="p-2">
                  {searchQuery && filteredSuggestions.length > 0 && <div className="divider my-1"></div>}
                  <div className="flex justify-between items-center px-3 py-2">
                    <h3 className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Recent Searches</h3>
                    <button
                      className="text-xs text-error hover:text-error-focus transition-colors"
                      onClick={handleClearRecentSearches}
                    >
                      Clear
                    </button>
                  </div>
                  <ul>
                    {recentSearches.map((search, index) => (
                      <li key={index}>
                        <button
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-base-200 transition-colors"
                          onClick={() => handleSearchSubmitWithOptions(search)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>{search}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {!searchQuery && recentSearches.length === 0 && (
                <div className="p-4 text-center text-sm text-base-content/60">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <p>Start typing to search...</p>
                    <p className="text-xs">Try: "bots", "configs", or "logs"</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Navbar End */}
      <div className="navbar-end gap-2">
        {/* Quick Actions */}
        <div className="tooltip tooltip-bottom" data-tip="Create New Bot">
          <button className="btn btn-ghost btn-circle btn-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
          </button>
        </div>

        {/* System Status Indicator */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm">
            <div className="indicator">
              <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
              <span className="indicator-item badge badge-xs badge-success"></span>
            </div>
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
            <li className="menu-title">System Status</li>
            <li><a>🟢 All Systems Online</a></li>
            <li><a>🤖 3 Bots Active</a></li>
            <li><a>📡 5 MCP Servers Connected</a></li>
            <li><a>⚡ 99.9% Uptime</a></li>
          </ul>
        </div>

        {/* Notifications */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle" onClick={onNotificationClick}>
            <div className="indicator">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
              {notificationCount > 0 && (
                <span className="badge badge-xs badge-primary indicator-item">{notificationCount}</span>
              )}
            </div>
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-80">
            <li className="menu-title">Recent Notifications</li>
            <li><a>🤖 Bot "Assistant" reconnected</a></li>
            <li><a>⚠️ High memory usage detected</a></li>
            <li><a>✅ MCP Server update completed</a></li>
            <li><a>📊 Weekly report generated</a></li>
            <li><a href="/admin/notifications" className="btn btn-sm btn-primary">View All</a></li>
          </ul>
        </div>

        {/* Theme Selector */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path>
            </svg>
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] p-2 shadow-2xl bg-base-300 rounded-box w-52">
            <li className="menu-title">Choose Theme</li>
            {themeOptions.map((theme) => (
              <li key={theme.value}>
                <input 
                  type="radio" 
                  name="theme-dropdown" 
                  className="theme-controller" 
                  value={theme.value} 
                  aria-label={theme.label}
                />
                <span className="flex items-center gap-2">
                  <span>{theme.emoji}</span>
                  {theme.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* User Menu */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-8 rounded-full">
              {userAvatar ? (
                <img alt="User avatar" src={userAvatar} />
              ) : (
                <div className="avatar placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-8">
                    <span className="text-xs">{userName.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li className="menu-title">{userName}</li>
            <li><a href="/profile">👤 Profile</a></li>
            <li><a href="/settings">⚙️ Settings</a></li>
            <li><a href="/help">❓ Help & Support</a></li>
            <li><a href="/docs">📚 Documentation</a></li>
            <li className="divider"></li>
            <li><a href="/logout" className="text-error">🚪 Sign out</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NavbarWithSearch;