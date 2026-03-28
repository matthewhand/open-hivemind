import fs from 'fs';
import path from 'path';
import type { Application } from 'express';

export interface RouteInfo {
  method: string;
  path: string;
  middleware: string[];
  description: string;
  tag: string;
}

export interface RouteGroup {
  prefix: string;
  label: string;
  routes: RouteInfo[];
}

/**
 * Extract JSDoc @openapi summary lines from a route source file.
 * Returns a map of "METHOD /path" -> summary string.
 */
function extractOpenApiSummaries(filePath: string): Map<string, string> {
  const summaries = new Map<string, string>();
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const openApiRegex = /\/\*\*[\s\S]*?@openapi[\s\S]*?\*\//g;
    let match: RegExpExecArray | null;
    while ((match = openApiRegex.exec(content)) !== null) {
      const block = match[0];
      const pathMatch = block.match(/\*\s+(\/\S+?):/);
      const methodMatch = block.match(/\*\s+(get|post|put|delete|patch):/i);
      const summaryMatch = block.match(/\*\s+summary:\s*(.+)/);
      if (pathMatch && methodMatch && summaryMatch) {
        const key = `${methodMatch[1].toUpperCase()} ${pathMatch[1]}`;
        summaries.set(key, summaryMatch[1].trim());
      }
    }
  } catch {
    // File not readable; skip
  }
  return summaries;
}

/**
 * Walk the Express app's route stack and extract all registered routes.
 */
export function introspectRoutes(app: Application): RouteGroup[] {
  const routesDir = path.join(__dirname, '..', 'routes');

  // Build a combined summaries map from all route files
  const allSummaries = new Map<string, string>();
  try {
    const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of files) {
      const fileSummaries = extractOpenApiSummaries(path.join(routesDir, file));
      for (const [key, val] of fileSummaries) {
        allSummaries.set(key, val);
      }
    }
  } catch {
    // routes dir not readable
  }

  const routeInfos: RouteInfo[] = [];

  // Walk the Express app stack
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack = (app as any)._router?.stack || [];
  for (const layer of stack) {
    if (layer.route) {
      extractRoute(layer, '', routeInfos, allSummaries);
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const prefix = extractMountPath(layer);
      for (const subLayer of layer.handle.stack) {
        if (subLayer.route) {
          extractRoute(subLayer, prefix, routeInfos, allSummaries);
        }
      }
    }
  }

  // Group by prefix
  const groupMap = new Map<string, RouteInfo[]>();
  for (const route of routeInfos) {
    const segments = route.path.split('/').filter(Boolean);
    const prefix = segments.length >= 2 ? `/${segments[0]}/${segments[1]}` : `/${segments[0] || ''}`;
    if (!groupMap.has(prefix)) {
      groupMap.set(prefix, []);
    }
    groupMap.get(prefix)!.push(route);
  }

  const groups: RouteGroup[] = [];
  for (const [prefix, routes] of groupMap) {
    groups.push({
      prefix,
      label: prefix
        .replace(/^\/api\//, '')
        .replace(/-/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase()),
      routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    });
  }

  return groups.sort((a, b) => a.prefix.localeCompare(b.prefix));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMountPath(layer: any): string {
  if (layer.regexp) {
    if (layer.regexp.fast_slash) {
      return '';
    }
    const regexpStr = layer.regexp.source || '';
    const pathMatch = regexpStr.match(/^\^\\(\/[^?]*?)(?:\\\/\?)?/);
    if (pathMatch) {
      return pathMatch[1].replace(/\\\//g, '/');
    }
  }
  return '';
}

function extractRoute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layer: any,
  prefix: string,
  routeInfos: RouteInfo[],
  summaries: Map<string, string>
): void {
  const route = layer.route;
  if (!route) return;

  const methods = Object.keys(route.methods).filter((m) => route.methods[m]);
  const routePath = prefix + route.path;

  for (const method of methods) {
    const upperMethod = method.toUpperCase();
    const middlewareNames: string[] = [];
    if (route.stack) {
      for (const handler of route.stack) {
        if (handler.name && handler.name !== '<anonymous>' && handler.name !== 'anonymous') {
          middlewareNames.push(handler.name);
        }
      }
    }

    const expressPath = routePath.replace(/:(\w+)/g, '{$1}');
    const lookupKey = `${upperMethod} ${expressPath}`;
    const description = summaries.get(lookupKey) || '';

    const segments = routePath.split('/').filter(Boolean);
    const tag = segments.length >= 2 ? segments[1] : segments[0] || 'root';

    routeInfos.push({
      method: upperMethod,
      path: routePath,
      middleware: middlewareNames,
      description,
      tag,
    });
  }
}
