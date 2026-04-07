/* eslint-disable react-refresh/only-export-components, no-empty, no-case-declarations */
import {
  LayoutDashboard, Bot,
  Settings, Cog, Activity, Component, MessageSquare, Brain,
  Map, Webhook, FileText, Store, BarChart3, ClipboardList,
  FileDown, HeartPulse, HelpCircle, FileCode, Info,
} from 'lucide-react';
import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string | number;
  children?: NavItem[];
  disabled?: boolean;
  divider?: boolean;
  visible?: boolean;
  requiredRole?: string;
}

// Icon wrapper for consistent sizing
const NavIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="w-4 h-4 flex items-center justify-center">{children}</span>
);

export const hivemindNavItems: NavItem[] = [
  // === MAIN ===
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <NavIcon><LayoutDashboard className="w-4 h-4" /></NavIcon>,
    path: '/admin/overview',
    visible: true,
  },

  // === CORE ===
  {
    id: 'bots',
    label: 'Bots',
    icon: <NavIcon><Bot className="w-4 h-4" /></NavIcon>,
    path: '/admin/bots',
    visible: true,
  },
  {
    id: 'providers',
    label: 'Providers',
    icon: <NavIcon><Cog className="w-4 h-4" /></NavIcon>,
    path: '/admin/providers',
    visible: true,
  },
  {
    id: 'community',
    label: 'Community',
    icon: <NavIcon><Store className="w-4 h-4" /></NavIcon>,
    path: '/admin/marketplace',
    visible: true,
  },

  // === SYSTEM ===
  {
    id: 'divider-system',
    label: 'System',
    icon: null as unknown as React.ReactNode,
    divider: true,
    visible: true,
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: <NavIcon><Activity className="w-4 h-4" /></NavIcon>,
    path: '/admin/activity',
    visible: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <NavIcon><Settings className="w-4 h-4" /></NavIcon>,
    path: '/admin/settings',
    visible: true,
  },

  // === OTHER ===
  {
    id: 'divider-other',
    label: 'Other',
    icon: null as unknown as React.ReactNode,
    divider: true,
    visible: true,
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: <NavIcon><FileCode className="w-4 h-4" /></NavIcon>,
    path: '/admin/developer',
    visible: true,
  },
  {
    id: 'about',
    label: 'About',
    icon: <NavIcon><Info className="w-4 h-4" /></NavIcon>,
    path: '/admin/about',
    visible: true,
  },
];

// Filter navigation items based on user role
export function filterNavItemsByRole(items: NavItem[], userRole?: string): NavItem[] {
  return items
    .filter(item => {
      if (!item.visible) { return false; }
      if (item.requiredRole && userRole !== item.requiredRole && userRole !== 'owner') {
        return false;
      }
      return true;
    })
    .map(item => ({
      ...item,
      children: item.children ? filterNavItemsByRole(item.children, userRole) : undefined,
    }));
}
