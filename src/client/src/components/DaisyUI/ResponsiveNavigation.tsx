import React, { useState } from 'react';
import { useMediaQuery } from '../../hooks/useBreakpoint';
import { EnhancedDrawer } from './Drawer';
import HamburgerMenu from './HamburgerMenu';
import { Menu as MenuIcon, X } from 'lucide-react';
import DemoModeBanner from '../DemoModeBanner';
import LlmStatusBanner from '../LlmStatusBanner';
import Breadcrumbs from './Breadcrumbs';
import RateLimitIndicator from './RateLimitIndicator';
import { useRateLimitToast } from '../../hooks/useRateLimitToast';
import Card from './Card';
import AppFooter from '../AppFooter';

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

  // Show toast when rate limit is exhausted
  useRateLimitToast();

  return (
    <div className={`min-h-screen flex bg-base-200 ${className}`}>

      {/* SIDEBAR - Fixed on left.
          Visibility is gated by CSS (`hidden lg:block`), NOT by the JS `isMobile`
          flag, so it can never diverge from the content offset below. The old
          `{!isMobile && ...}` + `isMobile ? ml-0 : ml-60` pairing could fall out
          of sync on first paint (useMediaQuery initialises false) and render the
          sidebar while the content offset was 0, clipping page headings under it. */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-60 bg-base-300 border-r border-base-content/10 z-40 overflow-y-auto">
        <EnhancedDrawer
          isOpen={true}
          onClose={() => { }}
          navItems={navItems}
          variant="sidebar"
        />
      </aside>

      {/* MOBILE HEADER (CSS-gated; hidden at lg so it never co-renders with the sidebar) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-base-300 border-b border-base-content/10 flex items-center justify-between px-4 z-50">
        <span className="font-semibold text-base-content truncate min-w-0">Hivemind</span>
        <div className="flex items-center gap-2">
          <RateLimitIndicator />
        </div>
        <HamburgerMenu
          isOpen={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
      </header>

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
        className="flex-1 min-w-0 min-h-screen flex flex-col transition-all duration-300 mt-14 ml-0 lg:mt-0 lg:ml-60"
      >
        {/* Rate limit indicator and Demo Mode Banner */}
        {!isMobile && (
          <div className="flex justify-end px-1">
            <RateLimitIndicator />
          </div>
        )}
        <DemoModeBanner />

        {/* MAIN CONTENT - With padding */}
        <main className="flex-1 p-6">
          {/* White content card */}
          <Card className="rounded-xl border border-base-content/10 shadow-sm min-h-[calc(100vh-48px)] p-6">
            <Breadcrumbs />
            <div className="mb-4">
              <LlmStatusBanner />
            </div>
            {children}
          </Card>
        </main>

        <AppFooter />
      </div>
    </div>
  );
};

export default ResponsiveNavigation;
