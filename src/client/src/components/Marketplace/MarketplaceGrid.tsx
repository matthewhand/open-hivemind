/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { apiService } from '../../services/api';
import Button from '../DaisyUI/Button';
import {
  Store as StoreIcon,
  Search as SearchIcon,
  AlertCircle as AlertIcon,
  CheckCircle as CheckIcon,
  X as CloseIcon,
  AlertTriangle as WarningIcon,
} from 'lucide-react';
import MarketplaceCard from './MarketplaceCard';
import type { MarketplacePackage } from './MarketplaceCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketplaceGridProps {
  /** Filter packages by type (e.g. "llm", "message") */
  filter?: string;
  onInstall?: (pkg: MarketplacePackage) => void;
  onUninstall?: (name: string) => void;
  onUpdate?: (name: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MarketplaceGrid: React.FC<MarketplaceGridProps> = ({
  filter,
  onInstall: externalOnInstall,
  onUninstall: externalOnUninstall,
  onUpdate: externalOnUpdate,
}) => {
  const [packages, setPackages] = useState<MarketplacePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const hasCommunityPackages = useMemo(
    () => packages.some((pkg) => pkg.status !== 'built-in'),
    [packages],
  );

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await apiService.get('/api/marketplace/packages');
      setPackages(data?.data || data || []);
    } catch (err: unknown) {
      setError(
        (err instanceof Error ? err.message : String(err)) || 'Failed to load marketplace',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesType = !filter || pkg.type === filter;
      const matchesSearch =
        searchQuery === '' ||
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [packages, filter, searchQuery]);

  const handleRating = useCallback((pkgName: string, starValue: number) => {
    setRatings((prev) => ({ ...prev, [pkgName]: starValue }));
  }, []);

  const handleInstall = useCallback((pkg: MarketplacePackage) => {
    if (externalOnInstall) {
      externalOnInstall(pkg);
      return;
    }
    if (!pkg.repoUrl) return;
    (async () => {
      setActionInProgress('install-url');
      setActionMessage(null);
      try {
        const result: any = await apiService.post('/api/marketplace/install', {
          repoUrl: pkg.repoUrl,
        });
        const data = result?.data || result;
        setActionMessage({
          type: 'success',
          text: `Installed ${data?.package?.displayName || pkg.displayName} successfully!`,
        });
        await fetchPackages();
      } catch (err: unknown) {
        setActionMessage({
          type: 'error',
          text: (err instanceof Error ? err.message : String(err)) || 'Installation failed',
        });
      } finally {
        setActionInProgress(null);
      }
    })();
  }, [externalOnInstall, fetchPackages]);

  const handleUpdate = useCallback(async (name: string) => {
    if (externalOnUpdate) {
      externalOnUpdate(name);
      return;
    }
    setActionInProgress(`update-${name}`);
    setActionMessage(null);
    try {
      const result: any = await apiService.post(`/api/marketplace/update/${name}`, {});
      const data = result?.data || result;
      setActionMessage({
        type: 'success',
        text: `Updated ${data?.package?.displayName || name} successfully!`,
      });
      await fetchPackages();
    } catch (err: unknown) {
      setActionMessage({
        type: 'error',
        text: (err instanceof Error ? err.message : String(err)) || 'Update failed',
      });
    } finally {
      setActionInProgress(null);
    }
  }, [externalOnUpdate, fetchPackages]);

  const handleUninstall = useCallback(async (name: string) => {
    if (externalOnUninstall) {
      externalOnUninstall(name);
      return;
    }
    if (!confirm(`Are you sure you want to uninstall ${name}?`)) return;
    setActionInProgress(`uninstall-${name}`);
    setActionMessage(null);
    try {
      await apiService.post(`/api/marketplace/uninstall/${name}`, {});
      setActionMessage({ type: 'success', text: `Uninstalled ${name} successfully!` });
      await fetchPackages();
    } catch (err: unknown) {
      setActionMessage({
        type: 'error',
        text: (err instanceof Error ? err.message : String(err)) || 'Uninstall failed',
      });
    } finally {
      setActionInProgress(null);
    }
  }, [externalOnUninstall, fetchPackages]);

  return (
    <div>
      {/* Alert Messages */}
      {actionMessage && (
        <div
          className={`alert mb-4 ${actionMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}
        >
          {actionMessage.type === 'success' ? (
            <CheckIcon className="w-5 h-5" />
          ) : (
            <AlertIcon className="w-5 h-5" />
          )}
          <span>{actionMessage.text}</span>
          <Button variant="ghost" size="xs" onClick={() => setActionMessage(null)}>
            <CloseIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Community Packages Warning */}
      {hasCommunityPackages && (
        <div className="alert alert-warning mb-4" data-testid="community-warning-banner">
          <WarningIcon className="w-5 h-5" />
          <span>
            Community packages are not officially maintained. Review source code and permissions
            before installing.
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="alert alert-error mb-4">
          <AlertIcon className="w-5 h-5" />
          <span>{error}</span>
          <Button variant="outline" size="xs" onClick={fetchPackages}>
            Retry
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
          <input
            type="text"
            placeholder="Search packages..."
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span
            className="loading loading-spinner loading-lg text-primary"
            aria-hidden="true"
          ></span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPackages.length === 0 && (
        <div className="text-center py-12">
          <StoreIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <p className="text-lg text-base-content/70">No packages found</p>
          <p className="text-sm text-base-content/50">Try adjusting your search or filter</p>
        </div>
      )}

      {/* Package Grid */}
      {!loading && filteredPackages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => {
            const isBusy =
              actionInProgress?.startsWith(pkg.name) ||
              actionInProgress === `update-${pkg.name}` ||
              actionInProgress === `uninstall-${pkg.name}`;

            return (
              <MarketplaceCard
                key={pkg.name}
                pkg={pkg}
                isBusy={!!isBusy}
                actionInProgress={actionInProgress}
                userRating={ratings[pkg.name]}
                onRate={handleRating}
                onInstall={handleInstall}
                onUpdate={handleUpdate}
                onUninstall={handleUninstall}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ⚡ Bolt Optimization: Added React.memo() to prevent unnecessary re-renders of the MarketplaceGrid when parent route components update.
// Handler functions were also wrapped in useCallback to maintain reference equality for memoized child components.
export default memo(MarketplaceGrid);
