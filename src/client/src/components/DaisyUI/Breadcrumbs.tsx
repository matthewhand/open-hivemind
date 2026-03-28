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
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// --- Public interfaces ---

export interface BreadcrumbItem {
  label: string;
  href: string;
  isActive?: boolean;
}

export interface BreadcrumbsProps {
  /**
   * When provided, renders these items instead of auto-generating from the URL.
   * Each item needs a label and href; set isActive on the current page.
   */
  items?: BreadcrumbItem[];
}

/**
 * Unified breadcrumb component.
 *
 * Auto mode (default, no props): generates breadcrumbs from the current
 * pathname using the route-label map, with a Home root link.
 *
 * Manual mode (items prop): renders the supplied items verbatim,
 * with a Home root link prepended.
 *
 * Always emits schema.org BreadcrumbList structured data.
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const location = useLocation();

  // --- Build the crumb list ---
  type Crumb = { label: string; path: string; isActive: boolean };
  let crumbs: Crumb[];

  if (items) {
    // Manual mode
    crumbs = items.map(item => ({
      label: item.label,
      path: item.href,
      isActive: !!item.isActive,
    }));
  } else {
    // Auto mode - derive from pathname
    const segments = location.pathname.split('/').filter(Boolean);

    // Don't render breadcrumbs on root or login-only paths
    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'login')) {
      return null;
    }

    crumbs = [];
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      crumbs.push({
        label: getSegmentLabel(segment),
        path: currentPath,
        isActive: index === segments.length - 1,
      });
    });
  }

  // --- Schema.org structured data ---
  const origin = window.location.origin;
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: origin,
      },
      ...crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: crumb.label,
        item: crumb.isActive
          ? `${origin}${location.pathname}`
          : `${origin}${crumb.path}`,
      })),
    ],
  };

  // --- Render ---
  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
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
          {crumbs.map((crumb, index) => {
            const isLast = items ? !!crumb.isActive : index === crumbs.length - 1;

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
    </>
  );
};

export default Breadcrumbs;

/**
 * @deprecated Use Breadcrumbs (the default export) with no props for auto mode.
 */
export const AutoBreadcrumbs = Breadcrumbs;
