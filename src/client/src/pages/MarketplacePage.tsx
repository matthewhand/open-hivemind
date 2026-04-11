import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import Button from '../components/DaisyUI/Button';
import {
  Store as StoreIcon,
  Search as SearchIcon,
  Github as GitHubIcon,
  AlertCircle as AlertIcon,
  AlertTriangle as WarningIcon,
  CheckCircle as CheckIcon,
  X as CloseIcon,
} from 'lucide-react';
import PageHeader from '../components/DaisyUI/PageHeader';
import { ConfirmModal } from '../components/DaisyUI/Modal';
import { Alert } from '../components/DaisyUI/Alert';
import Input from '../components/DaisyUI/Input';
import { apiService } from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterType = 'all' | 'llm' | 'message' | 'memory' | 'tool';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MarketplacePage: React.FC = () => {
  const [packages, setPackages] = useState<MarketplacePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await apiService.get('/api/marketplace/packages');
      setPackages(data);
    } catch (err: any) {

  // Handle star rating click
  const handleRating = (pkgName: string, starValue: number) => {
    setRatings((prev) => ({ ...prev, [pkgName]: starValue }));
  };

  // Fetch packages
  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await apiService.get('/api/marketplace/packages');
      setPackages(data?.data || data || []);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  // Filter packages
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const matchesType = filter === 'all' || pkg.type === filter;
      const matchesSearch = searchQuery === '' ||
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [packages, filter, searchQuery]);

  // Install from GitHub URL
  const handleInstallFromUrl = async () => {
    if (!githubUrl.trim()) return;

    setActionInProgress('install-url');
    setActionMessage(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await apiService.post('/api/marketplace/install', { repoUrl: githubUrl.trim() });
      const data = result?.data || result;
      setActionMessage({ type: 'success', text: `Installed ${data?.package?.displayName || 'package'} successfully!` });
      setGithubUrl('');
      setInstallModalOpen(false);
      await fetchPackages();
    } catch (err: unknown) {
      setActionMessage({ type: 'error', text: (err instanceof Error ? err.message : String(err)) || 'Installation failed' });
    } finally {
      setActionInProgress(null);
    }
  };

  // Install a specific package (from card button)
  const handleInstall = (pkg: MarketplacePackage) => {
    setGithubUrl(pkg.repoUrl || '');
    setInstallModalOpen(true);
  };

  // Update package
  const handleUpdate = async (name: string) => {
    setActionInProgress(`update-${name}`);
    setActionMessage(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await apiService.post(`/api/marketplace/update/${name}`, {});
      const data = result?.data || result;
      setActionMessage({ type: 'success', text: `Updated ${data?.package?.displayName || name} successfully!` });
      await fetchPackages();
    } catch (err: unknown) {
      setActionMessage({ type: 'error', text: (err instanceof Error ? err.message : String(err)) || 'Update failed' });
    } finally {
      setActionInProgress(null);
    }
  };

  // Uninstall package
  const handleUninstall = async (name: string) => {
    if (!confirm(`Are you sure you want to uninstall ${name}?`)) return;

    setActionInProgress(`uninstall-${name}`);
    setActionMessage(null);

    try {
      await apiService.post(`/api/marketplace/uninstall/${name}`, {});
      setActionMessage({ type: 'success', text: `Uninstalled ${name} successfully!` });
      await fetchPackages();
    } catch (err: unknown) {
      setActionMessage({ type: 'error', text: (err instanceof Error ? err.message : String(err)) || 'Uninstall failed' });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="p-6">
      {/* Alert Messages */}
      {actionMessage && (
        <div className={`alert mb-4 ${actionMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
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

      {/* Community Packages Warning Banner */}
      {hasCommunityPackages && (
        <div className="alert alert-warning mb-4" data-testid="community-warning-banner">
          <WarningIcon className="w-5 h-5" />
          <span>
            Community packages are not officially maintained. Review source code and permissions before installing.
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
          <Input
            type="text"
            placeholder="Search packages..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type Filter Tabs */}
        <div className="tabs tabs-boxed">
          {(['all', 'llm', 'message', 'memory', 'tool'] as FilterType[]).map((t) => (
            <button
              key={t}
              className={`tab ${filter === t ? 'tab-active' : ''}`}
              onClick={() => setFilter(t)}
            >
              {t === 'all' ? 'All' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" aria-hidden="true"></span>
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
        shouldVirtualizePackages ? (
          <div ref={packagesParentRef} className="max-h-[800px] overflow-auto">
            <div
              style={{
                height: `${packagesGridRowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {packagesGridRowVirtualizer.getVirtualItems().map((virtualRow) => {
                const startIndex = virtualRow.index * 3;
                const rowPackages = filteredPackages.slice(startIndex, startIndex + 3);

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

      {/* Install from URL Modal */}
      {installModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Install Package from GitHub</h3>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">GitHub Repository URL</span>
              </label>
              <Input
                type="text"
                placeholder="https://github.com/user/provider-package"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  Enter the full GitHub URL of the provider package
                </span>
              </label>
            </div>

            <div className="modal-action">
              <Button
                variant="ghost"
                onClick={() => {
                  setInstallModalOpen(false);
                  setGithubUrl('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleInstallFromUrl}
                disabled={!githubUrl.trim() || actionInProgress === 'install-url'}
              >
                {actionInProgress === 'install-url' ? (
                  <span className="loading loading-spinner loading-sm" aria-hidden="true"></span>
                ) : (
                  <>
                    <GitHubIcon className="w-4 h-4 mr-1" />
                    Install
                  </>
                )}
              </Button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              setInstallModalOpen(false);
              setGithubUrl('');
            }}
          ></div>
        </dialog>
      )}
    </div>
  );
};

export default MarketplacePage;
