import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useUrlParams from '../hooks/useUrlParams';
import Card from '../components/DaisyUI/Card';
import { SkeletonGrid } from '../components/DaisyUI/Skeleton';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import { ProgressBar, OperationStatus, TimeoutIndicator } from '../components/DaisyUI/LoadingComponents';

import {
  Store as StoreIcon,
  Download as DownloadIcon,
  RefreshCw as UpdateIcon,
  Trash2 as UninstallIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  Brain as LLMIcon,
  MessageCircle as MessageIcon,
  Database as MemoryIcon,
  Wrench as ToolIcon,
  Github as GitHubIcon,
  AlertCircle as AlertIcon,
  CheckCircle as CheckIcon,
  X as CloseIcon,
} from 'lucide-react';
import { ConfirmModal } from '../components/DaisyUI/Modal';

interface MarketplacePackage {
  name: string;
  displayName: string;
  description: string;
  type: 'llm' | 'message' | 'memory' | 'tool';
  version: string;
  status: 'built-in' | 'installed' | 'available';
  repoUrl?: string;
  installedAt?: string;
  updatedAt?: string;
}

type FilterType = 'all' | 'llm' | 'message' | 'memory' | 'tool';

interface InstallProgress {
  packageName: string;
  progress: number;
  stage: 'downloading' | 'installing' | 'configuring' | 'complete';
  startTime: number;
}

const TYPE_ICONS = {
  llm: LLMIcon,
  message: MessageIcon,
  memory: MemoryIcon,
  tool: ToolIcon,
} as const;

const TYPE_COLORS = {
  llm: 'secondary',
  message: 'primary',
  memory: 'accent',
  tool: 'info',
} as const;

const STATUS_BADGES = {
  'built-in': { label: 'Built-in', color: 'neutral' as const },
  'installed': { label: 'Installed', color: 'success' as const },
  'available': { label: 'Available', color: 'info' as const },
} as const;

const TYPE_DESCRIPTIONS = {
  llm: 'Language model providers for AI interactions',
  message: 'Message handling and communication providers',
  memory: 'Memory and context storage providers',
  tool: 'External tools and integrations',
} as const;

const MarketplacePage: React.FC = () => {
  const [packages, setPackages] = useState<MarketplacePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    type: { type: 'string', default: 'all' },
  });
  const filter = urlParams.type as FilterType;
  const setFilter = (v: FilterType) => setUrlParam('type', v);
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [hoveredPackage, setHoveredPackage] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [operationElapsed, setOperationElapsed] = useState(0);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingTimeout(false);

    const timeoutId = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000); // 10 second timeout warning

    try {
      const response = await fetch('/api/marketplace/packages');
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load marketplace');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setLoadingTimeout(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Operation timer
  useEffect(() => {
    if (!actionInProgress) {
      setOperationElapsed(0);
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      setOperationElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(timer);
  }, [actionInProgress]);

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

  const simulateProgress = (packageName: string, operation: 'install' | 'update') => {
    setInstallProgress({
      packageName,
      progress: 0,
      stage: 'downloading',
      startTime: Date.now(),
    });

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setInstallProgress(prev => prev ? { ...prev, progress: 100, stage: 'complete' } : null);
        clearInterval(progressInterval);
        setTimeout(() => setInstallProgress(null), 2000);
      } else {
        let stage: InstallProgress['stage'] = 'downloading';
        if (currentProgress > 70) stage = 'configuring';
        else if (currentProgress > 30) stage = 'installing';

        setInstallProgress(prev => prev ? { ...prev, progress: currentProgress, stage } : null);
      }
    }, 500);

    return () => clearInterval(progressInterval);
  };

  const handleInstallFromUrl = async () => {
    if (!githubUrl.trim()) return;

    setActionInProgress('install-url');
    setActionMessage(null);
    const cleanup = simulateProgress(githubUrl.split('/').pop() || 'Package', 'install');

    try {
      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: githubUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Installation failed');
      }

      setActionMessage({ type: 'success', text: `Installed ${data.package.displayName} successfully!` });
      setGithubUrl('');
      setInstallModalOpen(false);
      await fetchPackages();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Installation failed' });
    } finally {
      cleanup();
      setActionInProgress(null);
    }
  };

  const handleInstall = async (pkg: MarketplacePackage) => {
    setActionInProgress(`install-${pkg.name}`);
    setActionMessage(null);
    const cleanup = simulateProgress(pkg.displayName, 'install');

    try {
      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: pkg.repoUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to install ${pkg.displayName}`);
      }

      setActionMessage({ type: 'success', text: `Successfully installed ${pkg.displayName}!` });
      await fetchPackages();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || `Failed to install ${pkg.displayName}` });
    } finally {
      cleanup();
      setActionInProgress(null);
    }
  };

  const handleUpdate = async (name: string) => {
    const pkg = packages.find(p => p.name === name);
    setActionInProgress(`update-${name}`);
    setActionMessage(null);
    const cleanup = simulateProgress(pkg?.displayName || name, 'update');

    try {
      const response = await fetch(`/api/marketplace/update/${name}`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Update failed');
      }

      setActionMessage({ type: 'success', text: `Updated ${data.package.displayName} successfully!` });
      await fetchPackages();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      cleanup();
      setActionInProgress(null);
    }
  };

  const handleUninstall = async (name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Uninstall Package',
      message: `Are you sure you want to uninstall ${name}?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setActionInProgress(`uninstall-${name}`);
        setActionMessage(null);

        try {
          const response = await fetch(`/api/marketplace/uninstall/${name}`, { method: 'POST' });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Uninstall failed');
          }

          setActionMessage({ type: 'success', text: `Uninstalled ${name} successfully!` });
          await fetchPackages();
        } catch (err: any) {
          setActionMessage({ type: 'error', text: err.message || 'Uninstall failed' });
        } finally {
          setActionInProgress(null);
        }
      },
    });
  };

  const handleCancelInstall = () => {
    setInstallProgress(null);
    setActionInProgress(null);
    setActionMessage({ type: 'error', text: 'Installation cancelled' });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <StoreIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Package Marketplace</h1>
            <p className="text-sm text-base-content/70">
              Browse, install, and manage provider packages
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPackages}
            disabled={loading}
            aria-busy={loading}
            aria-label="Refresh package list"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setInstallModalOpen(true)}
            aria-label="Install package from GitHub URL"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Install from URL
          </Button>
        </div>
      </div>

      {/* Loading Timeout Warning */}
      {loadingTimeout && (
        <div className="alert alert-warning mb-4">
          <AlertIcon className="w-5 h-5" />
          <span>Loading is taking longer than expected. Please wait or try refreshing.</span>
        </div>
      )}

      {/* Alert Messages */}
      {actionMessage && (
        <div
          className={`alert mb-4 shadow-lg ${actionMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}
          role="alert"
        >
          {actionMessage.type === 'success' ? (
            <CheckIcon className="w-5 h-5" />
          ) : (
            <AlertIcon className="w-5 h-5" />
          )}
          <span className="font-medium">{actionMessage.text}</span>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setActionMessage(null)}
            aria-label="Dismiss message"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Operation Status */}
      {actionInProgress && (
        <OperationStatus
          isLoading={true}
          operation={
            actionInProgress.startsWith('install-') ? 'Installing package' :
            actionInProgress.startsWith('update-') ? 'Updating package' :
            actionInProgress.startsWith('uninstall-') ? 'Uninstalling package' :
            'Processing'
          }
          elapsedTime={operationElapsed}
          showTimeout
          timeoutMs={30000}
          allowCancel={actionInProgress.startsWith('install-')}
          onCancel={handleCancelInstall}
          className="mb-4"
        />
      )}

      {/* Install Progress */}
      {installProgress && (
        <div className="fixed bottom-4 right-4 w-96 bg-base-100 shadow-2xl rounded-lg p-4 border border-base-300 z-50 animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold">Installing {installProgress.packageName}</h4>
            {installProgress.stage !== 'complete' && (
              <button
                className="btn btn-ghost btn-xs btn-square"
                onClick={handleCancelInstall}
                aria-label="Cancel installation"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-sm capitalize opacity-70">
              Stage: {installProgress.stage}
            </div>
            <ProgressBar
              current={installProgress.progress}
              total={100}
              showPercentage
              variant="primary"
            />
            <TimeoutIndicator
              isLoading={installProgress.stage !== 'complete'}
              timeoutMs={30000}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="alert alert-error mb-4 shadow-lg" role="alert">
          <AlertIcon className="w-5 h-5" />
          <span className="font-medium">{error}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={fetchPackages}
            aria-label="Retry loading packages"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
          <input
            type="text"
            placeholder="Search packages..."
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search packages"
          />
        </div>

        <div className="tabs tabs-boxed" role="tablist" aria-label="Filter packages by type">
          {(['all', 'llm', 'message', 'memory', 'tool'] as FilterType[]).map((t) => (
            <button
              key={t}
              role="tab"
              className={`tab ${filter === t ? 'tab-active' : ''}`}
              onClick={() => setFilter(t)}
              aria-selected={filter === t}
              aria-label={`Filter by ${t === 'all' ? 'all types' : t + ' packages'}`}
            >
              {t === 'all' ? 'All' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Description */}
      {filter !== 'all' && (
        <div className="mb-4 text-sm text-base-content/70 flex items-center gap-2">
          {React.createElement(TYPE_ICONS[filter as keyof typeof TYPE_ICONS], { className: 'w-4 h-4' })}
          <span>{TYPE_DESCRIPTIONS[filter as keyof typeof TYPE_DESCRIPTIONS]}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <SkeletonGrid count={6} showImage />
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
            const Icon = TYPE_ICONS[pkg.type];
            const color = TYPE_COLORS[pkg.type];
            const statusBadge = STATUS_BADGES[pkg.status];
            const isBusy = actionInProgress === `install-${pkg.name}` ||
                          actionInProgress === `update-${pkg.name}` ||
                          actionInProgress === `uninstall-${pkg.name}`;
            const isHovered = hoveredPackage === pkg.name;

            return (
              <Card
                key={pkg.name}
                className="bg-base-200 hover:bg-base-300 transition-colors relative"
                onMouseEnter={() => setHoveredPackage(pkg.name)}
                onMouseLeave={() => setHoveredPackage(null)}
              >
                <Card.Body className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-${color}/10`}>
                        <Icon className={`w-5 h-5 text-${color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{pkg.displayName}</h3>
                        <p className="text-xs text-base-content/50 font-mono">{pkg.name}</p>
                      </div>
                    </div>
                    <Badge variant={statusBadge.color} size="sm">
                      {statusBadge.label}
                    </Badge>
                  </div>

                  <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
                    {pkg.description}
                  </p>

                  {isHovered && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-base-100 shadow-xl rounded-lg z-10 border border-base-300">
                      <p className="text-sm text-base-content">{pkg.description}</p>
                      <div className="mt-2 text-xs text-base-content/60">
                        <div>Type: {pkg.type.toUpperCase()}</div>
                        <div>Version: {pkg.version}</div>
                        {pkg.installedAt && <div>Installed: {new Date(pkg.installedAt).toLocaleDateString()}</div>}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-base-content/50 mb-3">
                    <span>v{pkg.version}</span>
                    <span className="uppercase badge badge-sm badge-outline">{pkg.type}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {pkg.status === 'installed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUpdate(pkg.name)}
                          disabled={isBusy}
                          aria-label={`Update ${pkg.displayName}`}
                          aria-busy={actionInProgress === `update-${pkg.name}`}
                        >
                          {actionInProgress === `update-${pkg.name}` ? (
                            <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
                          ) : (
                            <UpdateIcon className="w-4 h-4" />
                          )}
                          {actionInProgress === `update-${pkg.name}` ? 'Updating...' : 'Update'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUninstall(pkg.name)}
                          disabled={isBusy}
                          aria-label={`Uninstall ${pkg.displayName}`}
                          aria-busy={actionInProgress === `uninstall-${pkg.name}`}
                        >
                          {actionInProgress === `uninstall-${pkg.name}` ? (
                            <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
                          ) : (
                            <UninstallIcon className="w-4 h-4 text-error" />
                          )}
                        </Button>
                      </>
                    )}
                    {pkg.status === 'available' && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleInstall(pkg)}
                        disabled={isBusy}
                        aria-label={`Install ${pkg.displayName}`}
                        aria-busy={actionInProgress === `install-${pkg.name}`}
                      >
                        {actionInProgress === `install-${pkg.name}` ? (
                          <>
                            <span className="loading loading-spinner loading-xs mr-1" aria-hidden="true"></span>
                            Installing...
                          </>
                        ) : (
                          <>
                            <DownloadIcon className="w-4 h-4 mr-1" />
                            Install
                          </>
                        )}
                      </Button>
                    )}
                    {pkg.status === 'built-in' && (
                      <span className="text-xs text-base-content/50 italic w-full text-center">
                        Included with open-hivemind
                      </span>
                    )}
                  </div>
                </Card.Body>
              </Card>
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
              <input
                type="text"
                placeholder="https://github.com/user/provider-package"
                className="input input-bordered w-full"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                aria-label="GitHub repository URL"
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
                aria-label="Cancel installation"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleInstallFromUrl}
                disabled={!githubUrl.trim() || actionInProgress === 'install-url'}
                aria-label="Install package from URL"
                aria-busy={actionInProgress === 'install-url'}
              >
                {actionInProgress === 'install-url' ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-1" aria-hidden="true"></span>
                    Installing...
                  </>
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
            aria-label="Close modal"
          ></div>
        </dialog>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        confirmVariant="error"
        confirmText="Uninstall"
        cancelText="Cancel"
      />
    </div>
  );
};

const RefreshCw = UpdateIcon;

export default MarketplacePage;
