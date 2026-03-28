/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteInfo {
  method: string;
  path: string;
  middleware: string[];
  description: string;
  tag: string;
}

interface RouteGroup {
  prefix: string;
  label: string;
  routes: RouteInfo[];
}

interface ApiDocsResponse {
  success: boolean;
  data: {
    generatedAt: string;
    groups: RouteGroup[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: 'badge-success',
  POST: 'badge-info',
  PUT: 'badge-warning',
  DELETE: 'badge-error',
  PATCH: 'badge-secondary',
};

function getMethodBadgeClass(method: string): string {
  return METHOD_COLORS[method.toUpperCase()] || 'badge-ghost';
}

function getCsrfToken(): string | null {
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag ? metaTag.getAttribute('content') : null;
}

async function fetchCsrfToken(): Promise<string> {
  try {
    const res = await fetch('/api/csrf-token', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      return data.csrfToken || data.token || '';
    }
  } catch {
    // ignore
  }
  return getCsrfToken() || '';
}

// ─── Components ───────────────────────────────────────────────────────────────

/** Sidebar listing route groups */
const GroupSidebar: React.FC<{
  groups: RouteGroup[];
  activePrefix: string | null;
  onSelect: (prefix: string) => void;
  counts: Map<string, number>;
}> = ({ groups, activePrefix, onSelect, counts }) => (
  <ul className="menu menu-sm bg-base-200 rounded-box w-full">
    {groups.map((group) => (
      <li key={group.prefix}>
        <button
          className={`justify-between ${activePrefix === group.prefix ? 'active' : ''}`}
          onClick={() => onSelect(group.prefix)}
        >
          <span className="truncate">{group.label}</span>
          <span className="badge badge-sm badge-ghost">
            {counts.get(group.prefix) ?? group.routes.length}
          </span>
        </button>
      </li>
    ))}
  </ul>
);

/** "Try it" panel for a single route */
const TryItPanel: React.FC<{ route: RouteInfo }> = ({ route }) => {
  const [requestBody, setRequestBody] = useState('{}');
  const [response, setResponse] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    setResponse(null);
    setStatusCode(null);

    try {
      const csrfToken = await fetchCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const options: RequestInit = {
        method: route.method,
        headers,
        credentials: 'include',
      };

      if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
        options.body = requestBody;
      }

      // Replace path params with placeholder values for the request
      const url = route.path.replace(/:(\w+)/g, '_$1_');
      const res = await fetch(url, options);
      setStatusCode(res.status);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponse(JSON.stringify(json, null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err: any) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-base-200 rounded-lg space-y-2">
      {['POST', 'PUT', 'PATCH'].includes(route.method) && (
        <div>
          <label className="label label-text text-xs font-semibold">Request Body (JSON)</label>
          <textarea
            className="textarea textarea-bordered textarea-sm w-full font-mono text-xs"
            rows={4}
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
          />
        </div>
      )}
      <button
        className={`btn btn-sm btn-primary ${loading ? 'loading' : ''}`}
        onClick={send}
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Request'}
      </button>
      {response !== null && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold">Response</span>
            {statusCode !== null && (
              <span
                className={`badge badge-sm ${statusCode < 400 ? 'badge-success' : 'badge-error'}`}
              >
                {statusCode}
              </span>
            )}
          </div>
          <pre className="bg-base-300 p-2 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
            {response}
          </pre>
        </div>
      )}
    </div>
  );
};

/** Single route card with expandable details */
const RouteCard: React.FC<{ route: RouteInfo }> = ({ route }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="collapse collapse-arrow bg-base-100 border border-base-300 mb-2">
      <input type="checkbox" checked={expanded} onChange={() => setExpanded(!expanded)} />
      <div className="collapse-title flex items-center gap-3 py-2 min-h-0">
        <span className={`badge badge-sm font-mono ${getMethodBadgeClass(route.method)}`}>
          {route.method}
        </span>
        <code className="text-sm font-mono flex-1">{route.path}</code>
        {route.description && (
          <span className="text-xs text-base-content/60 hidden md:inline truncate max-w-xs">
            {route.description}
          </span>
        )}
      </div>
      <div className="collapse-content">
        {route.description && <p className="text-sm mb-2">{route.description}</p>}

        {route.middleware.length > 0 && (
          <div className="mb-2">
            <span className="text-xs font-semibold">Middleware:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {route.middleware.map((m, i) => (
                <span key={i} className="badge badge-xs badge-outline">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-2">
          <span className="text-xs font-semibold">Path parameters:</span>
          {route.path.includes(':') ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {(route.path.match(/:(\w+)/g) || []).map((p, i) => (
                <span key={i} className="badge badge-xs badge-primary badge-outline">
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-base-content/50 ml-1">None</span>
          )}
        </div>

        {['POST', 'PUT', 'PATCH'].includes(route.method) && (
          <div className="mb-2">
            <span className="text-xs font-semibold">Request body:</span>
            <span className="text-xs text-base-content/50 ml-1">application/json</span>
          </div>
        )}

        <TryItPanel route={route} />
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ApiDocsPage: React.FC = () => {
  const [groups, setGroups] = useState<RouteGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePrefix, setActivePrefix] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const res = await fetch('/api/docs', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiDocsResponse = await res.json();
        setGroups(data.data.groups);
        if (data.data.groups.length > 0) {
          setActivePrefix(data.data.groups[0].prefix);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDocs();
  }, []);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const lowerSearch = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        routes: g.routes.filter(
          (r) =>
            r.path.toLowerCase().includes(lowerSearch) ||
            r.method.toLowerCase().includes(lowerSearch) ||
            r.description.toLowerCase().includes(lowerSearch) ||
            r.tag.toLowerCase().includes(lowerSearch)
        ),
      }))
      .filter((g) => g.routes.length > 0);
  }, [groups, search]);

  const filteredCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of filteredGroups) {
      counts.set(g.prefix, g.routes.length);
    }
    return counts;
  }, [filteredGroups]);

  const activeGroup = useMemo(
    () => filteredGroups.find((g) => g.prefix === activePrefix) || filteredGroups[0] || null,
    [filteredGroups, activePrefix]
  );

  const totalRoutes = useMemo(
    () => groups.reduce((sum, g) => sum + g.routes.length, 0),
    [groups]
  );

  const handleSelectGroup = useCallback((prefix: string) => {
    setActivePrefix(prefix);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error m-4">
        <span>Failed to load API documentation: {error}</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">API Documentation</h1>
          <p className="text-sm text-base-content/60">
            {totalRoutes} endpoints across {groups.length} groups — auto-generated from route
            introspection
          </p>
        </div>
        <div className="form-control w-full sm:w-64">
          <input
            type="text"
            placeholder="Search endpoints..."
            className="input input-bordered input-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <GroupSidebar
            groups={filteredGroups}
            activePrefix={activePrefix}
            onSelect={handleSelectGroup}
            counts={filteredCounts}
          />
        </div>

        {/* Routes list */}
        <div className="flex-1 min-w-0">
          {activeGroup ? (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <code className="text-sm">{activeGroup.prefix}</code>
                <span className="badge badge-sm">{activeGroup.routes.length} endpoints</span>
              </h2>
              {activeGroup.routes.map((route, i) => (
                <RouteCard key={`${route.method}-${route.path}-${i}`} route={route} />
              ))}
            </div>
          ) : (
            <div className="text-center text-base-content/50 py-12">
              {search ? 'No endpoints match your search.' : 'Select a group from the sidebar.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiDocsPage;
