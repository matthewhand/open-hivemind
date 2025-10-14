export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  badge?: string | number;
  children?: NavItem[];
  disabled?: boolean;
  divider?: boolean;
  visible?: boolean;
  requiredRole?: string;
}

export const hivemindNavItems: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '📊',
    path: '/admin/overview',
    visible: true,
  },
  {
    id: 'bots-section',
    label: 'Bot Management',
    icon: '🤖',
    path: '/admin/bots',
    badge: 3,
    visible: true,
    children: [
      {
        id: 'bots-list',
        label: 'All Bots',
        icon: '📋',
        path: '/admin/bots',
        visible: true,
      },
      {
        id: 'bots-create',
        label: 'Create Bot',
        icon: '➕',
        path: '/admin/bots/create',
        visible: true,
      },
      {
        id: 'bots-templates',
        label: 'Templates',
        icon: '📝',
        path: '/admin/bots/templates',
        visible: true,
      },
    ],
  },
  {
    id: 'personas',
    label: 'Personas',
    icon: '🎭',
    path: '/admin/personas',
    visible: true,
  },
  {
    id: 'mcp-section',
    label: 'MCP Servers',
    icon: '🔧',
    path: '/admin/mcp',
    visible: true,
    requiredRole: 'owner',
    children: [
      {
        id: 'mcp-servers',
        label: 'Servers',
        icon: '🖥️',
        path: '/admin/mcp/servers',
        visible: true,
      },
      {
        id: 'mcp-tools',
        label: 'Tools',
        icon: '🛠️',
        path: '/admin/mcp/tools',
        visible: true,
      },
    ],
  },
  {
    id: 'guards',
    label: 'Guards',
    icon: '🛡️',
    path: '/admin/guards',
    visible: true,
    requiredRole: 'owner',
  },
  {
    id: 'monitoring-section',
    label: 'Monitoring',
    icon: '📈',
    path: '/admin/monitoring',
    visible: true,
    children: [
      {
        id: 'monitoring-dashboard',
        label: 'Activity Monitor',
        icon: '📊',
        path: '/admin/monitoring',
        visible: true,
      },
      {
        id: 'monitoring-advanced',
        label: 'Advanced Dashboard',
        icon: '📈',
        path: '/admin/monitoring-dashboard',
        visible: true,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: '📉',
        path: '/admin/analytics',
        visible: true,
      },
      {
        id: 'activity',
        label: 'Activity Log',
        icon: '📋',
        path: '/admin/activity',
        badge: 'NEW',
        visible: true,
      },
    ],
  },
  {
    id: 'system-section',
    label: 'System',
    icon: '⚙️',
    path: '/admin/system-management',
    visible: true,
    children: [
      {
        id: 'system-management',
        label: 'System Management',
        icon: '🔧',
        path: '/admin/system-management',
        visible: true,
      },
      {
        id: 'export',
        label: 'Export & Backup',
        icon: '💾',
        path: '/admin/export',
        visible: true,
      },
      {
        id: 'configuration',
        label: 'Bot Configuration',
        icon: '🎛️',
        path: '/admin/configuration',
        visible: true,
        requiredRole: 'owner',
      },
    ],
  },
  {
    id: 'divider-1',
    label: '',
    icon: '',
    divider: true,
    visible: true,
  },
  {
    id: 'settings-section',
    label: 'Settings',
    icon: '⚙️',
    path: '/admin/settings',
    visible: true,
    children: [
      {
        id: 'settings-general',
        label: 'General Settings',
        icon: '🔧',
        path: '/admin/settings',
        visible: true,
      },
      {
        id: 'static-pages',
        label: 'Static Pages',
        icon: '📄',
        path: '/admin/static',
        visible: true,
      },
      {
        id: 'sitemap',
        label: 'Sitemap',
        icon: '🗺️',
        path: '/admin/sitemap',
        visible: true,
      },
    ],
  },
  {
    id: 'development',
    label: 'Development',
    icon: '🎨',
    path: '/admin/showcase',
    visible: true,
    children: [
      {
        id: 'daisyui-showcase',
        label: 'DaisyUI Showcase',
        icon: '🎨',
        path: '/admin/showcase',
        visible: true,
      },
    ],
  },
];

export const filterNavItemsByRole = (items: NavItem[], userRole?: string): NavItem[] => {
  return items
    .filter(item => {
      // Filter out items that are not visible
      if (item.visible === false) return false;
      
      // Filter out items that require a specific role
      if (item.requiredRole && userRole !== item.requiredRole) return false;
      
      return true;
    })
    .map(item => {
      // Recursively filter children
      if (item.children) {
        const filteredChildren = filterNavItemsByRole(item.children, userRole);
        return {
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : undefined,
        };
      }
      return item;
    });
};

export const getActiveItem = (items: NavItem[], pathname: string): NavItem | null => {
  for (const item of items) {
    if (item.path && (pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/')))) {
      return item;
    }
    if (item.children) {
      const activeChild = getActiveItem(item.children, pathname);
      if (activeChild) return activeChild;
    }
  }
  return null;
};