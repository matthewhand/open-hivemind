import { describe, it, expect } from 'vitest';
import { matchPath } from 'react-router-dom';
import { PALETTE_ITEMS } from '../CommandPalette';

/**
 * Guards against stale Command Palette targets.
 *
 * Every palette item navigates the user to a path. If that path is not a real
 * route (or a route that redirects), the user lands on the catch-all `*` route
 * which bounces them back to `/`. This test asserts each palette target matches
 * a concrete route pattern declared in AppRouter.tsx.
 *
 * The pattern list below mirrors the admin `<Route>` declarations in
 * src/client/src/router/AppRouter.tsx. Routes are nested under `/admin`.
 */
const ADMIN_ROUTE_PATTERNS = [
  '/admin/overview',
  '/admin/bots',
  '/admin/bots/create',
  '/admin/bots/templates',
  '/admin/llm',
  '/admin/message',
  '/admin/memory',
  '/admin/tool',
  '/admin/config/response-profiles',
  '/admin/personas',
  '/admin/guards',
  '/admin/marketplace',
  '/admin/mcp',
  '/admin/mcp/servers',
  '/admin/mcp/tools',
  '/admin/analytics',
  '/admin/system-management',
  '/admin/export',
  '/admin/settings',
  '/admin/configuration',
  '/admin/config',
  '/admin/developer',
  '/admin/specs/:id',
  '/admin/audit',
  '/admin/health',
  '/admin/health/providers',
  '/admin/webhooks',
  '/admin/api-docs',
  '/admin/help',
  '/admin/about',
];

const isValidRoute = (target: string): boolean => {
  // Drop any query string / hash — routing matches on pathname only.
  const pathname = target.split('?')[0].split('#')[0];
  return ADMIN_ROUTE_PATTERNS.some((pattern) => matchPath(pattern, pathname) !== null);
};

describe('CommandPalette route targets', () => {
  it('exposes palette items', () => {
    expect(PALETTE_ITEMS.length).toBeGreaterThan(0);
  });

  it.each(PALETTE_ITEMS.map((item) => [item.id, item.path] as const))(
    'palette item "%s" navigates to a real route (%s)',
    (_id, path) => {
      expect(isValidRoute(path)).toBe(true);
    }
  );

  it('does not navigate through the legacy /admin/providers/* redirects', () => {
    const legacyTargets = PALETTE_ITEMS.filter((item) =>
      item.path.startsWith('/admin/providers/')
    );
    expect(legacyTargets).toEqual([]);
  });
});
