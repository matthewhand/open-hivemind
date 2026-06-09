/* eslint-disable react-refresh/only-export-components, no-empty, no-case-declarations */
//
// Navigation Configuration
//
// NAMING CONVENTION:
// - Labels should match the domain language users expect:
//   "Messaging" (not "Platforms") for Slack/Discord/Mattermost connections
//   "LLM" for language model provider configuration
//   "Bots" for bot management
// - Keep labels to 1–2 words; avoid generic terms like "Other" or "Platforms"
// - Use "Resources" for secondary links (Developer, About)
// - Section dividers use capitalized labels (System, Resources)
//
// TIERING (see /ROADMAP.md):
// - 'mvp'          → no badge, always visible
// - 'beta'         → [Beta] chip, always visible
// - 'experimental' → [Experimental] chip, hidden unless VITE_ENABLE_EXPERIMENTAL=true
//
// When adding a new nav item, ensure:
// 1. The label matches the page title and domain language
// 2. The path exists in AppRouter.tsx (or has a redirect)
// 3. A `tier` is assigned (default 'mvp')
// 4. A screenshot is added to the PR for visual review
//
import {
  LayoutDashboard, Bot,
  Settings, Cog, Component, MessageSquare, Brain,
  Map, Webhook, FileText, Store, BarChart3, ClipboardList,
  FileDown, HeartPulse, HelpCircle, FileCode, Info, Activity,
} from 'lucide-react';
import React from 'react';

export type NavItemTier = 'mvp' | 'beta' | 'experimental';

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
  tier?: NavItemTier;
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
    tier: 'mvp',
  },

  // === CORE ===
  {
    id: 'bots',
    label: 'Bots',
    icon: <NavIcon><Bot className="w-4 h-4" /></NavIcon>,
    path: '/admin/bots',
    visible: true,
    tier: 'mvp',
  },
  {
    id: 'message',
    label: 'Messaging',
    icon: <NavIcon><MessageSquare className="w-4 h-4" /></NavIcon>,
    path: '/admin/message',
    visible: true,
    tier: 'mvp',
  },
  {
    id: 'llm',
    label: 'LLM',
    icon: <NavIcon><Brain className="w-4 h-4" /></NavIcon>,
    path: '/admin/llm',
    visible: true,
    tier: 'mvp',
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: <NavIcon><Component className="w-4 h-4" /></NavIcon>,
    path: '/admin/memory',
    visible: true,
    tier: 'beta',
  },
  {
    id: 'tool',
    label: 'Tool',
    icon: <NavIcon><Cog className="w-4 h-4" /></NavIcon>,
    path: '/admin/tool',
    visible: true,
    tier: 'beta',
  },
  {
    id: 'personas',
    label: 'Personas',
    icon: <NavIcon><ClipboardList className="w-4 h-4" /></NavIcon>,
    path: '/admin/personas',
    visible: true,
    tier: 'mvp',
  },
  {
    id: 'response-profiles',
    label: 'Response Profiles',
    icon: <NavIcon><MessageSquare className="w-4 h-4" /></NavIcon>,
    path: '/admin/config/response-profiles',
    visible: true,
    tier: 'beta',
  },
  {
    id: 'guards',
    label: 'Guards',
    icon: <NavIcon><HeartPulse className="w-4 h-4" /></NavIcon>,
    path: '/admin/guards',
    visible: true,
    tier: 'mvp',
  },
  {
    id: 'community',
    label: 'Community',
    icon: <NavIcon><Store className="w-4 h-4" /></NavIcon>,
    path: '/admin/marketplace',
    visible: true,
    tier: 'experimental',
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
    id: 'settings',
    label: 'Settings',
    icon: <NavIcon><Settings className="w-4 h-4" /></NavIcon>,
    path: '/admin/settings',
    visible: true,
    tier: 'mvp',
  },
  {
    id: 'provider-health',
    label: 'Provider Health',
    icon: <NavIcon><Activity className="w-4 h-4" /></NavIcon>,
    path: '/admin/health/providers',
    visible: true,
    // The backing endpoint (/api/admin/provider-health) serves simulated data
    // and is gated behind ENABLE_MOCK_PROVIDER_HEALTH on the server (501 when
    // unset). Hidden from primary nav via the experimental tier until a real
    // metrics pipeline exists; the page itself remains routable directly.
    tier: 'experimental',
  },

  // === RESOURCES ===
  {
    id: 'divider-resources',
    label: 'Resources',
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
    tier: 'experimental',
  },
  {
    id: 'about',
    label: 'About',
    icon: <NavIcon><Info className="w-4 h-4" /></NavIcon>,
    path: '/admin/about',
    visible: true,
    tier: 'mvp',
  },
];

// Whether the experimental tier is enabled for this client build.
// Pulls from Vite env at compile time so it's tree-shakable in prod.
const experimentalEnabled = (): boolean => {
  // Vite exposes import.meta.env.* at build time. Guard for non-Vite runtimes (tests).
  try {
    return import.meta.env?.VITE_ENABLE_EXPERIMENTAL === 'true';
  } catch {
    return false;
  }
};

// Decorate a nav item with a tier-derived badge and visibility flag.
// Items already declaring a badge keep theirs (explicit beats derived).
function applyTier(item: NavItem, experimental: boolean): NavItem | null {
  if (item.divider) return item;
  const tier = item.tier ?? 'mvp';
  if (tier === 'experimental' && !experimental) return null;

  let badge = item.badge;
  if (badge == null) {
    if (tier === 'beta') badge = 'Beta';
    else if (tier === 'experimental') badge = 'Experimental';
  }

  return { ...item, badge };
}

// Filter navigation items based on user role AND tier visibility.
export function filterNavItemsByRole(items: NavItem[], userRole?: string): NavItem[] {
  const experimental = experimentalEnabled();
  return items
    .map(item => applyTier(item, experimental))
    .filter((item): item is NavItem => item !== null)
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
