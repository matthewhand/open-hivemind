import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MobileDrawer, defaultMobileNavItems } from '../components/DaisyUI';

const drawerWidth = 'w-60'; // Replaced number with TailwindCSS class

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navItems = [
    { label: 'WebUI', to: '/webui' },
    { label: 'Admin', to: '/admin' },
  ];

  return (
    <div className="flex h-screen">
      {/* Mobile Drawer - Hidden on lg screens and up */}
      <div className="lg:hidden">
        <MobileDrawer navItems={defaultMobileNavItems}>
          <main className="p-2">{children}</main>
        </MobileDrawer>
      </div>

      {/* Desktop Layout - Hidden on smaller screens */}
      <div className={`hidden lg:flex flex-col ${drawerWidth} flex-shrink-0`}>
        <div className="h-16 flex items-center px-4">
          <h6 className="text-xl font-semibold">Open-Hivemind</h6>
        </div>
        <div className="overflow-y-auto">
          <ul className="menu p-4">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={
                    location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                      ? 'active'
                      : ''
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <main className="flex-grow p-3 hidden lg:block">
        <div className="h-16" /> {/* Toolbar spacer */}
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
