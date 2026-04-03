import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import useUrlParams from '../hooks/useUrlParams';
import Card from '../components/DaisyUI/Card';
import { SkeletonGrid } from '../components/DaisyUI/Skeleton';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import Tabs from '../components/DaisyUI/Tabs';

import {
  Store as StoreIcon,
  Download as DownloadIcon,
  RefreshCw as UpdateIcon,
  RefreshCw,
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
import PageHeader from '../components/DaisyUI/PageHeader';
import { ConfirmModal } from '../components/DaisyUI/Modal';
import { Alert } from '../components/DaisyUI/Alert';
import { apiService } from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// Static Tailwind class mappings (dynamic construction like `text-${color}` is not JIT-safe)
const TYPE_COLOR_CLASSES: Record<string, { text: string; bg: string }> = {
  secondary: { text: 'text-secondary', bg: 'bg-secondary/10' },
  primary: { text: 'text-primary', bg: 'bg-primary/10' },
  accent: { text: 'text-accent', bg: 'bg-accent/10' },
  info: { text: 'text-info', bg: 'bg-info/10' },
};

const STATUS_BADGES = {
  'built-in': { label: 'Built-in', color: 'neutral' as const },
  'installed': { label: 'Installed', color: 'success' as const },
  'available': { label: 'Available', color: 'info' as const },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MarketplacePage: React.FC = () => {
  const [packages, setPackages] = useState<MarketplacePackage[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await apiService.get('/api/marketplace/packages');
      setPackages(Array.isArray(data) ? data : []);
    } catch (err: any) {

      setError(err.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch packages
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

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

  // Virtualization for large package lists
  const packagesParentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualizePackages = filteredPackages.length > 50;
  const packagesGridRowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredPackages.length / 3), // 3 columns
    getScrollElement: () => packagesParentRef.current,
    estimateSize: () => 300, // Estimated card height
    overscan: 2,
    enabled: shouldVirtualizePackages,
  });

  // Install from GitHub URL
  const handleInstallFromUrl = async () => {
    if (!githubUrl.trim()) return;

    setActionInProgress('install-url');
    setActionMessage(null);

    try {
      const data: any = await apiService.post('/api/marketplace/install', {
        repoUrl: githubUrl.trim()
      });

      setActionMessage({ type: 'success', text: `Installed ${data.package.displayName} successfully!` });
      setGithubUrl('');
      setInstallModalOpen(false);
      await fetchPackages();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Installation failed' });
    } finally {
      setActionInProgress(null);
    }
  };

  // Update package
  const handleUpdate = async (name: string) => {
    setActionInProgress(`update-${name}`);
    setActionMessage(null);

    try {
      const data: any = await apiService.post(`/api/marketplace/update/${name}`);

      setActionMessage({ type: 'success', text: `Updated ${data.package.displayName} successfully!` });
      await fetchPackages();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setActionInProgress(null);
    }
  };

  // Uninstall package
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
          await apiService.post(`/api/marketplace/uninstall/${name}`);

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


  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Package Marketplace"
        description="Browse, install, and manage provider packages"
        icon={StoreIcon}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchPackages}
              disabled={loading} aria-busy={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInstallModalOpen(true)}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Install from URL
            </Button>
          </div>
        }
      />

      {/* Alert Messages */}
      {actionMessage && (
        <div className={`alert mb-4 ${actionMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {actionMessage.type === 'success' ? (
            <CheckIcon className="w-5 h-5" />
          ) : (
            <AlertIcon className="w-5 h-5" />
          )}
          <span>{actionMessage.text}</span>
          <div className="tooltip" data-tip="Dismiss">
            <Button variant="ghost" size="xs" onClick={() => setActionMessage(null)} aria-label="Dismiss">
              <CloseIcon className="w-4 h-4" />
            </Button>
          </div>        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert status="error" className="mb-4">
          <AlertIcon className="w-5 h-5" />
          <span>{error}</span>
          <Button variant="ghost" size="xs" onClick={fetchPackages}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
          <input
            type="text"
            placeholder="Search packages..."
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type Filter Tabs */}
        <Tabs
          tabs={(['all', 'llm', 'message', 'memory', 'tool'] as FilterType[]).map((t) => ({
            key: t,
            label: t === 'all' ? 'All' : t.toUpperCase(),
          }))}
          activeTab={filter}
          onChange={(key) => setFilter(key as FilterType)}
        />
      </div>

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
        shouldVirtualizePackages ? (
          <div ref={packagesParentRef} className="overflow-auto" style={{ height: '800px' }}>
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
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                      {rowPackages.map((pkg) => {
                        const Icon = TYPE_ICONS[pkg.type];
                        const color = TYPE_COLORS[pkg.type];
                        const statusBadge = STATUS_BADGES[pkg.status];
                        const isBusy = actionInProgress?.startsWith(pkg.name) ||
                                      actionInProgress === `update-${pkg.name}` ||
                                      actionInProgress === `uninstall-${pkg.name}`;

                        return (
              <Card key={pkg.name} className="bg-base-200 hover:bg-base-300 transition-colors">
                <Card.Body className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${TYPE_COLOR_CLASSES[color]?.bg ?? ''}`}>
                        <Icon className={`w-5 h-5 ${TYPE_COLOR_CLASSES[color]?.text ?? ''}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{pkg.displayName}</h3>
                        <p className="text-xs text-base-content/50 font-mono">{pkg.name}</p>
                      </div>
                    </div>
                    <Badge variant="primary" size="small">
                      {statusBadge.label}
                    </Badge>
                  </div>

                  <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
                    {pkg.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-base-content/50 mb-3">
                    <span>v{pkg.version}</span>
                    <span className="uppercase badge badge-sm badge-outline">{pkg.type}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {pkg.status === 'installed' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUpdate(pkg.name)}
                          disabled={isBusy}
                        >
                          {actionInProgress === `update-${pkg.name}` ? (
                            <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
                          ) : (
                            <UpdateIcon className="w-4 h-4" />
                          )}
                          Update
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUninstall(pkg.name)}
                          disabled={isBusy}
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
                        onClick={() => {
                          setGithubUrl(pkg.repoUrl || '');
                          setInstallModalOpen(true);
                        }}
                        disabled={isBusy}
                      >
                        <DownloadIcon className="w-4 h-4 mr-1" />
                        Install
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
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPackages.map((pkg) => {
              const Icon = TYPE_ICONS[pkg.type];
              const color = TYPE_COLORS[pkg.type];
              const statusBadge = STATUS_BADGES[pkg.status];
              const isBusy = actionInProgress?.startsWith(pkg.name) ||
                            actionInProgress === `update-${pkg.name}` ||
                            actionInProgress === `uninstall-${pkg.name}`;

              return (
                <Card key={pkg.name} className="bg-base-200 hover:bg-base-300 transition-colors">
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
                          >
                            {actionInProgress === `update-${pkg.name}` ? (
                              <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
                            ) : (
                              <UpdateIcon className="w-4 h-4" />
                            )}
                            Update
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUninstall(pkg.name)}
                            disabled={isBusy}
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
                          onClick={() => {
                            setGithubUrl(pkg.repoUrl || '');
                            setInstallModalOpen(true);
                          }}
                          disabled={isBusy}
                        >
                          <DownloadIcon className="w-4 h-4 mr-1" />
                          Install
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
        )
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

export default MarketplacePage;
