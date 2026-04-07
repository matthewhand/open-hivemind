/* eslint-disable react-refresh/only-export-components, no-empty, no-case-declarations */
import {
  LayoutDashboard, Bot, Users, Shield,
  Settings, Cog, Activity, Component, MessageSquare, Brain,
  Map, Webhook, FileText, Store, BarChart3, ClipboardList,
  FileDown, HeartPulse, HelpCircle, FileCode,
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
  // === MAIN SECTION ===
  {
    id: 'overview',
    label: 'Dashboard',
    icon: <NavIcon><LayoutDashboard className="w-4 h-4" /></NavIcon>,
    path: '/admin/overview',
    visible: true,
  },


  // === CONFIGURATION SECTION ===
  {
    id: 'divider-behavior',
    label: 'Configuration',
    icon: null as unknown as React.ReactNode,
    divider: true,
    visible: true,
  },
  {
    id: 'integrations-llm',
    label: 'LLM Providers',
    icon: <NavIcon><Brain className="w-4 h-4" /></NavIcon>,
    path: '/admin/providers/llm',
    visible: true,
  },
  {
    id: 'integrations-message',
    label: 'Message Providers',
    icon: <NavIcon><MessageSquare className="w-4 h-4" /></NavIcon>,
    path: '/admin/providers/message',
    visible: true,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: <NavIcon><Store className="w-4 h-4" /></NavIcon>,
    path: '/admin/marketplace',
    visible: true,
  },
  {
    id: 'bots-section',
    label: 'Bots',
    icon: <NavIcon><Bot className="w-4 h-4" /></NavIcon>,
    path: '/admin/bots',
    visible: true,
  },
  {
    id: 'personas',
    label: 'Personas',
    icon: <NavIcon><Users className="w-4 h-4" /></NavIcon>,
    path: '/admin/personas',
    visible: true,
  },
  {
    id: 'guards',
    label: 'Guards',
    icon: <NavIcon><Shield className="w-4 h-4" /></NavIcon>,
    path: '/admin/guards',
    visible: true,
  },
  {
    id: 'provider-configs',
    label: 'Provider Configs',
    icon: <NavIcon><FileCode className="w-4 h-4" /></NavIcon>,
    path: '/admin/config',
    visible: true,
  },
  {
    id: 'settings',
    label: 'System',
    icon: null as unknown as React.ReactNode,
    divider: true,
    visible: true,
  },
  {
    id: 'system-settings',
    label: 'Settings',
    icon: <NavIcon><Cog className="w-4 h-4" /></NavIcon>,
    path: '/admin/settings',
    visible: true,
  },
  {
    id: 'export-import',
    label: 'Import / Export',
    icon: <NavIcon><FileDown className="w-4 h-4" /></NavIcon>,
    path: '/admin/export',
    visible: true,
  },
  {
    id: 'audit-log',
    label: 'Audit Log',
    icon: <NavIcon><ClipboardList className="w-4 h-4" /></NavIcon>,
    path: '/admin/audit',
    visible: true,
  },
  {
    id: 'system-health',
    label: 'System Health',
    icon: <NavIcon><HeartPulse className="w-4 h-4" /></NavIcon>,
    path: '/admin/health',
    visible: true,
  },

  // Settings, Monitoring, Global Defaults all under SYSTEM
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: <NavIcon><Activity className="w-4 h-4" /></NavIcon>,
    path: '/admin/monitoring',
    visible: true,
  },
  {
    id: 'activity-log',
    label: 'Activity Log',
    icon: <NavIcon><ClipboardList className="w-4 h-4" /></NavIcon>,
    path: '/admin/activity',
    visible: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <NavIcon><BarChart3 className="w-4 h-4" /></NavIcon>,
    path: '/admin/analytics',
    visible: true,
  },
  {
    id: 'webhooks',
    label: 'Webhook Events',
    icon: <NavIcon><Webhook className="w-4 h-4" /></NavIcon>,
    path: '/admin/webhooks',
    visible: true,
  },
  {
    id: 'configuration',
    label: 'Global Defaults',
    icon: <NavIcon><Settings className="w-4 h-4" /></NavIcon>,
    path: '/admin/configuration',
    visible: true,
  },
  // === DEVELOPER SECTION ===
  {
    id: 'divider-dev',
    label: 'Developer',
    icon: null as unknown as React.ReactNode,
    divider: true,
    visible: true,
  },
  {
    id: 'showcase',
    label: 'UI Components',
    icon: <NavIcon><Component className="w-4 h-4" /></NavIcon>,
    path: '/admin/showcase',
    visible: true,
  },
  {
    id: 'sitemap',
    label: 'Sitemap',
    icon: <NavIcon><Map className="w-4 h-4" /></NavIcon>,
    path: '/admin/sitemap',
    visible: true,
  },
  {
    id: 'api-docs',
    label: 'API Docs',
    icon: <NavIcon><FileText className="w-4 h-4" /></NavIcon>,
    path: '/admin/api-docs',
    visible: true,
  },
  {
    id: 'static-pages',
    label: 'Static Pages',
    icon: <NavIcon><FileCode className="w-4 h-4" /></NavIcon>,
    path: '/admin/static',
    visible: true,
  },
  {
    id: 'specs',
    label: 'Specs',
    icon: <NavIcon><FileText className="w-4 h-4" /></NavIcon>,
    path: '/admin/specs',
    visible: true,
  },
  {
    id: 'help',
    label: 'Help & Docs',
    icon: <NavIcon><HelpCircle className="w-4 h-4" /></NavIcon>,
    path: '/admin/help',
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
