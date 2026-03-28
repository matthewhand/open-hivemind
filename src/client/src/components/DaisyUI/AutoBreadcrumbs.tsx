import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/solid';

/**
 * Route segment to human-readable label mapping.
 * Supports both static segments and dynamic patterns.
 */
const ROUTE_LABELS: Record<string, string> = {
  admin: 'Admin',
  overview: 'Overview',
  bots: 'Bots',
  create: 'Create',
  templates: 'Templates',
  chat: 'Chat',
  personas: 'Personas',
  integrations: 'Integrations',
  providers: 'Providers',
  message: 'Message',
  llm: 'LLM',
  memory: 'Memory',
  tool: 'Tool',
  marketplace: 'Marketplace',
  mcp: 'MCP',
  servers: 'Servers',
  tools: 'Tools',
  guards: 'Guards',
  monitoring: 'Monitoring',
  activity: 'Activity',
  'monitoring-dashboard': 'Monitoring Dashboard',
  analytics: 'Analytics',
  'system-management': 'System Management',
  export: 'Export',
  settings: 'Settings',
  configuration: 'Configuration',
  config: 'Config',
  static: 'Static Pages',
  sitemap: 'Sitemap',
  showcase: 'DaisyUI Showcase',
  specs: 'Specifications',
  audit: 'Audit',
  health: 'Health',
  webhooks: 'Webhooks',
  'api-docs': 'API Docs',
  dashboard: 'Dashboard',
  onboarding: 'Onboarding',
};

/**
 * Resolves a URL segment to a human-readable label.
 * Falls back to title-casing the segment if not in the config map.
 */
function getSegmentLabel(segment: string): string {
  if (ROUTE_LABELS[segment]) {
    return ROUTE_LABELS[segment];
  }
  // For dynamic segments (IDs, UUIDs, etc.), just show the value
  // Fall back to title-case conversion for unknown segments
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface BreadcrumbSegment {
  label: string;
  path: string;
}

/**
 * AutoBreadcrumbs - Automatically generates breadcrumb navigation from the current URL path.
 *
 * Uses DaisyUI breadcrumbs classes and react-router's useLocation.
 * Each segment is a clickable link except the last (current page).
 * Integrates into the layout so all pages get breadcrumbs automatically.
 */
const AutoBreadcrumbs: React.FC = () => {
  const location = useLocation();

  const segments = location.pathname.split('/').filter(Boolean);

  // Don't render breadcrumbs on root or login
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'login')) {
    return null;
  }

  const breadcrumbs: BreadcrumbSegment[] = [];
  let currentPath = '';

  for (const segment of segments) {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      label: getSegmentLabel(segment),
      path: currentPath,
    });
  }

  return (
    <nav className="breadcrumbs text-sm mb-4" aria-label="Breadcrumb">
      <ul>
        {/* Home link */}
        <li>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-base-content/60 hover:text-primary transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            Home
          </Link>
        </li>

        {/* Path segments */}
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.path}>
              {isLast ? (
                <span className="text-base-content font-medium" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-base-content/60 hover:text-primary transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AutoBreadcrumbs;
