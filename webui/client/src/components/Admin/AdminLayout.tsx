import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Build as BuildIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: <DashboardIcon /> },
  { label: 'Agent Management', to: '/admin/agents', icon: <PeopleIcon /> },
  { label: 'Persona Management', to: '/admin/personas', icon: <BuildIcon /> },
  { label: 'MCP Servers', to: '/admin/mcp-servers', icon: <CloudIcon /> },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="flex h-screen">
      <div className="drawer lg:drawer-open">
        <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col">
          {/* Main content */}
          <div className="flex-1 p-6">
            {children}
          </div>
        </div>
        <div className="drawer-side z-0">
          <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>
          <div className="menu bg-base-200 text-base-content min-h-full w-64 p-4">
            <div className="mb-6">
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
            <ul>
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      location.pathname.startsWith(item.to)
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-300'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;