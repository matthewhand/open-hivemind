import React, { useState } from 'react';
import { useMediaQuery } from '../../hooks/useResponsive';
import EnhancedDrawer from './EnhancedDrawer';
import { Button } from './Button';

interface NavItem {
  id: string;
  label: string;
  icon: string;
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
  className = ''
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = !useMediaQuery({ minWidth: 1024 }); // lg breakpoint

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={`flex min-h-screen bg-base-200 ${className}`}>
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-base-100 border-b border-base-300">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-8">
                  <span className="text-sm font-bold">H</span>
                </div>
              </div>
              <div>
                <h1 className="text-base font-bold">Hivemind</h1>
                <p className="text-xs text-base-content/60">Admin Dashboard</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMobileMenuToggle}
              className="p-2"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="fixed left-0 top-0 h-full z-30">
          <EnhancedDrawer
            isOpen={true}
            onClose={() => {}}
            navItems={navItems}
            variant="sidebar"
          />
        </div>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <EnhancedDrawer
          isOpen={isMobileMenuOpen}
          onClose={handleMobileMenuClose}
          navItems={navItems}
          variant="mobile"
        />
      )}

      {/* Main Content */}
      <main className={`
        flex-1 transition-all duration-300 ease-in-out
        ${isMobile ? 'ml-0 pt-16' : 'ml-72'}
      `}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ResponsiveNavigation;