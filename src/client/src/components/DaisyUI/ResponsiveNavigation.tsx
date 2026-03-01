import React, { useState } from 'react';
import { useMediaQuery } from '../../hooks/useResponsive';
import EnhancedDrawer from './EnhancedDrawer';
import { Menu as MenuIcon, X } from 'lucide-react';
import DemoModeBanner from '../DemoModeBanner';
import LlmStatusBanner from '../LlmStatusBanner';
import OfflineBanner from '../OfflineBanner';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string | number;
  children?: NavItem[];
  disabled?: boolean;
  divider?: boolean;
}

interface ResponsiveNavigationProps {
  navItems: NavItem[];
  children: React.ReactNode;
  className?: string;
}

const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  navItems,
  children,
  className = '',
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = !useMediaQuery({ minWidth: 1024 });

  return (
    <div className={`min-h-screen flex bg-base-200 ${className}`}>

      {/* SIDEBAR - Fixed on left */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-base-300 border-r border-base-content/10 z-40 overflow-y-auto">
          <EnhancedDrawer
            isOpen={true}
            onClose={() => { }}
            navItems={navItems}
            variant="sidebar"
          />
        </aside>
      )}

      {/* MOBILE HEADER */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-14 bg-base-300 border-b border-base-content/10 flex items-center justify-between px-4 z-50">
          <span className="font-semibold text-base-content">Hivemind</span>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="btn btn-ghost btn-sm btn-square"
          >
            {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </header>
      )}

      {/* MOBILE DRAWER */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed top-14 left-0 right-0 bottom-0 bg-base-300 z-45 overflow-y-auto">
          <EnhancedDrawer
            isOpen={true}
            onClose={() => setIsMobileMenuOpen(false)}
            navItems={navItems}
            variant="mobile"
          />
        </div>
      )}

      {/* MAIN CONTENT WRAPPER - Offset for sidebar */}
      <div
        className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${isMobile ? 'mt-14 ml-0' : 'mt-0 ml-[240px]'}`}
      >
        <OfflineBanner />
        {/* Demo Mode Banner - Full width relative to content wrapper */}
        <DemoModeBanner />

        {/* MAIN CONTENT - With padding */}
        <main className="flex-1 p-6">
          {/* White content card */}
          <div className="bg-base-100 rounded-xl border border-base-content/10 shadow-sm min-h-[calc(100vh-48px)] p-6">
            <div className="mb-4">
              <LlmStatusBanner />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResponsiveNavigation;
