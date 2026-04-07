import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import useUrlParams from '../hooks/useUrlParams';
import Card from '../components/DaisyUI/Card';
import { SkeletonGrid } from '../components/DaisyUI/Skeleton';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import Modal from '../components/DaisyUI/Modal';
import Tabs from '../components/DaisyUI/Tabs';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import Tooltip from '../components/DaisyUI/Tooltip';
import Divider from '../components/DaisyUI/Divider';
import { Rating } from '../components/DaisyUI/Rating';
import DetailDrawer from '../components/DaisyUI/DetailDrawer';

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
  ExternalLink as ExternalLinkIcon,
  Info as InfoIcon,
  Calendar as CalendarIcon,
  Tag as TagIcon,
} from 'lucide-react';
import PageHeader from '../components/DaisyUI/PageHeader';
import { ConfirmModal } from '../components/DaisyUI/Modal';
import { Alert } from '../components/DaisyUI/Alert';
import Input from '../components/DaisyUI/Input';
import Figure from '../components/DaisyUI/Figure';
import { apiService } from '../services/api';
import Pagination from '../components/DaisyUI/Pagination';

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
  trusted?: boolean;
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [drawerPkg, setDrawerPkg] = useState<MarketplacePackage | null>(null);
  const [drawerTab, setDrawerTab] = useState('overview');

  // Local ratings stored in localStorage
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('pkg-ratings') || '{}'); } catch { return {}; }
  });
  const handleRating = (name: string, value: number) => {
    const updated = { ...ratings, [name]: value };
    setRatings(updated);
    localStorage.setItem('pkg-ratings', JSON.stringify(updated));
  };
  /** Get the issues URL for a package — goes to the package owner's repo, not ours */
  const getFeedbackUrl = (pkg: MarketplacePackage) => {
    if (pkg.repoUrl) return `${pkg.repoUrl}/issues`;
    return `https://github.com/matthewhand/open-hivemind/issues/new?title=${encodeURIComponent(`[Package] ${pkg.name}: `)}`;
  };

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
    setCurrentPage(1);
    return packages.filter(pkg => {
      const matchesType = filter === 'all' || pkg.type === filter;
      const matchesSearch = searchQuery === '' ||
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [packages, filter, searchQuery]);

  const paginatedPackages = useMemo(() =>
    filteredPackages.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredPackages, currentPage, pageSize]);

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
        title="Community Packages"
        description="Install community plugins from GitHub — built-in packages are maintained by the core team"
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

      {/* Community Warning — only show when untrusted packages exist */}
      {packages.some(p => p.trusted === false) && (
        <div className="alert alert-warning mb-4 text-sm">
          <AlertIcon className="w-5 h-5 shrink-0" />
          <span><strong>Community packages are untested and unverified.</strong> Only install from sources you trust. Community plugins are loaded from GitHub and run with full application privileges.</span>
        </div>
      )}

      {/* Alert Messages */}
      {actionMessage && (
        <div className={`alert mb-4 ${actionMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {actionMessage.type === 'success' ? (
            <CheckIcon className="w-5 h-5" />
          ) : (
            <AlertIcon className="w-5 h-5" />
          )}
          <span>{actionMessage.text}</span>
          <Tooltip content="Dismiss">
            <Button variant="ghost" size="xs" onClick={() => setActionMessage(null)} aria-label="Dismiss">
              <CloseIcon className="w-4 h-4" />
            </Button>
          </Tooltip>        </div>
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
          <Input
            type="text"
            placeholder="Search packages..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type Filter Tabs */}
        <Tabs variant="lifted"
          tabs={(['all', 'llm', 'message', 'memory', 'tool'] as FilterType[]).map((t) => {
            const colors: Record<string, 'primary' | 'secondary' | 'accent' | 'info'> = {
              llm: 'primary', message: 'secondary', memory: 'accent', tool: 'info',
            };
            return { key: t, label: t === 'all' ? 'All' : t.toUpperCase(), color: colors[t] };
          })}
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
              <Card
                key={pkg.name}
                className={`bg-base-200 hover:bg-base-300 transition-colors cursor-pointer ${
                  drawerPkg?.name === pkg.name ? 'ring-2 ring-primary/30 border-primary' : ''
                }`}
                onClick={() => { setDrawerPkg(pkg); setDrawerTab('overview'); }}
              >
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
                    <div className="flex gap-1">
                      {!pkg.trusted && pkg.status !== 'built-in' && (
                        <Badge variant="warning" size="sm">Community</Badge>
                      )}
                      <Badge variant={statusBadge.color} size="sm">
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
                    {pkg.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-base-content/50 mb-2">
                    <span>v{pkg.version}</span>
                    <span className="uppercase badge badge-sm badge-outline">{pkg.type}</span>
                  </div>

                  {/* Rating + Feedback */}
                  <div className="flex items-center justify-between mb-3" onClick={(e) => e.stopPropagation()}>
                    <Rating
                      value={ratings[pkg.name] || 0}
                      max={5}
                      size="xs"
                      half
                      onChange={(v) => handleRating(pkg.name, v)}
                      name={`rating-${pkg.name}`}
                    />
                    <a
                      href={getFeedbackUrl(pkg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-xs"
                    >
                      Feedback ↗
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                            <LoadingSpinner size="xs" />
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
                            <LoadingSpinner size="xs" />
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPackages.map((pkg) => {
              const Icon = TYPE_ICONS[pkg.type];
              const color = TYPE_COLORS[pkg.type];
              const statusBadge = STATUS_BADGES[pkg.status];
              const isBusy = actionInProgress?.startsWith(pkg.name) ||
                            actionInProgress === `update-${pkg.name}` ||
                            actionInProgress === `uninstall-${pkg.name}`;

              return (
                <Card
                  key={pkg.name}
                  className={`bg-base-200 hover:bg-base-300 transition-colors cursor-pointer ${
                    drawerPkg?.name === pkg.name ? 'ring-2 ring-primary/30 border-primary' : ''
                  }`}
                  onClick={() => { setDrawerPkg(pkg); setDrawerTab('overview'); }}
                >
                  <Card.Body className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Figure
                          caption={<span className="text-[10px] uppercase font-bold opacity-40">{pkg.type}</span>}
                          className="flex flex-col items-center"
                        >
                          <div className={`p-2 rounded-lg bg-${color}/10`}>
                            <Icon className={`w-5 h-5 text-${color}`} />
                          </div>
                        </Figure>
                        <div>
                          <h3 className="font-semibold">{pkg.displayName}</h3>
                          <p className="text-xs text-base-content/50 font-mono">{pkg.name}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!pkg.trusted && pkg.status !== 'built-in' && (
                          <Badge variant="warning" size="sm">Community</Badge>
                        )}
                        <Badge variant={statusBadge.color} size="sm">
                          {statusBadge.label}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
                      {pkg.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-base-content/50 mb-2">
                      <span>v{pkg.version}</span>
                      <span className="uppercase badge badge-sm badge-outline">{pkg.type}</span>
                    </div>

                    {/* Rating + Feedback */}
                    <div className="flex items-center justify-between mb-3">
                      <Rating
                        value={ratings[pkg.name] || 0}
                        max={5}
                        size="sm"
                        half
                        onChange={(v) => handleRating(pkg.name, v)}
                        name={`drawer-rating-${pkg.name}`}
                      />
                      <a
                        href={getFeedbackUrl(pkg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-xs btn-ghost gap-1"
                      >
                        Leave Feedback ↗
                      </a>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                              <LoadingSpinner size="xs" />
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
                              <LoadingSpinner size="xs" />
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
            <div className="flex justify-center mt-6">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredPackages.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              style="standard"
            />
          </div>
          </>
        )
      )}

      {/* Install from URL Modal */}
      <Modal
        isOpen={installModalOpen}
        onClose={() => { setInstallModalOpen(false); setGithubUrl(''); }}
        title="Install Package from GitHub"
        size="md"
        actions={[
          { label: 'Cancel', onClick: () => { setInstallModalOpen(false); setGithubUrl(''); }, variant: 'ghost' },
          { label: 'Install', onClick: handleInstallFromUrl, variant: 'primary', disabled: !githubUrl.trim() || actionInProgress === 'install-url', loading: actionInProgress === 'install-url' },
        ]}
      >
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
      </Modal>

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

      {/* Package Detail Drawer */}
      <DetailDrawer
        isOpen={!!drawerPkg}
        onClose={() => setDrawerPkg(null)}
        title={drawerPkg?.displayName}
        subtitle={drawerPkg ? `${drawerPkg.name} v${drawerPkg.version}` : undefined}
        renderDock={
          drawerPkg && (
            <>
              {drawerPkg.status === 'installed' && (
                <>
                  <button
                    className="text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => handleUpdate(drawerPkg.name)}
                    disabled={actionInProgress?.startsWith(drawerPkg.name)}
                    title="Update Package"
                  >
                    {actionInProgress === `update-${drawerPkg.name}` ? (
                      <LoadingSpinner size="xs" />
                    ) : (
                      <UpdateIcon className="w-5 h-5" />
                    )}
                    <span className="dock-label text-[10px]">Update</span>
                  </button>
                  <button
                    className="text-error hover:bg-error/10 transition-colors"
                    onClick={() => handleUninstall(drawerPkg.name)}
                    disabled={actionInProgress?.startsWith(drawerPkg.name)}
                    title="Uninstall Package"
                  >
                    {actionInProgress === `uninstall-${drawerPkg.name}` ? (
                      <LoadingSpinner size="xs" />
                    ) : (
                      <UninstallIcon className="w-5 h-5" />
                    )}
                    <span className="dock-label text-[10px]">Uninstall</span>
                  </button>
                </>
              )}
              {drawerPkg.status === 'available' && (
                <button
                  className="text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => {
                    setDrawerPkg(null);
                    setGithubUrl(drawerPkg.repoUrl || '');
                    setInstallModalOpen(true);
                  }}
                  disabled={actionInProgress?.startsWith(drawerPkg.name)}
                  title="Install Package"
                >
                  <DownloadIcon className="w-5 h-5" />
                  <span className="dock-label text-[10px]">Install</span>
                </button>
              )}
              {drawerPkg.status === 'built-in' && (
                <div className="text-center text-[10px] text-base-content/50 italic px-4 py-2 flex items-center justify-center w-full">
                  Built-in packages are managed by open-hivemind
                </div>
              )}
            </>
          )
        }
      >
        {drawerPkg && (() => {
          const Icon = TYPE_ICONS[drawerPkg.type];
          const color = TYPE_COLORS[drawerPkg.type];
          const statusBadge = STATUS_BADGES[drawerPkg.status];
          const isBusy = actionInProgress?.startsWith(drawerPkg.name) ||
                        actionInProgress === `update-${drawerPkg.name}` ||
                        actionInProgress === `uninstall-${drawerPkg.name}`;

          return (
            <div className="space-y-4">
              {/* Drawer Tabs */}
              <Tabs
                tabs={[
                  { key: 'overview', label: 'Overview' },
                  { key: 'details', label: 'Details' },
                ]}
                activeTab={drawerTab}
                onChange={setDrawerTab}
                variant="boxed"
                size="sm"
              />

              {drawerTab === 'overview' && (
                <div className="space-y-4">
                  {/* Type & Status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`p-2 rounded-lg ${TYPE_COLOR_CLASSES[color]?.bg ?? 'bg-base-200'}`}>
                      <Icon className={`w-5 h-5 ${TYPE_COLOR_CLASSES[color]?.text ?? ''}`} />
                    </div>
                    <Badge variant={statusBadge.color} size="sm">{statusBadge.label}</Badge>
                    <span className="uppercase badge badge-sm badge-outline">{drawerPkg.type}</span>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Description</label>
                    <p className="text-sm whitespace-pre-wrap">{drawerPkg.description || 'No description available.'}</p>
                  </div>

                  <Divider />

                  {/* Version & Dates */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-base-content/70">
                      <TagIcon className="w-4 h-4" />
                      <span>Version <strong>{drawerPkg.version}</strong></span>
                    </div>
                    {drawerPkg.installedAt && (
                      <div className="flex items-center gap-2 text-base-content/70">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Installed {new Date(drawerPkg.installedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {drawerPkg.updatedAt && (
                      <div className="flex items-center gap-2 text-base-content/70">
                        <UpdateIcon className="w-4 h-4" />
                        <span>Updated {new Date(drawerPkg.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Repo Link */}
                  {drawerPkg.repoUrl && (
                    <>
                      <Divider />
                      <a
                        href={drawerPkg.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm btn-block gap-2"
                      >
                        <GitHubIcon className="w-4 h-4" />
                        View on GitHub
                        <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    </>
                  )}

                  <Divider />

                  {/* Installation Status Indicator */}
                  <div className={`rounded-lg p-3 text-sm ${
                    drawerPkg.status === 'installed'
                      ? 'bg-success/10 text-success'
                      : drawerPkg.status === 'built-in'
                        ? 'bg-neutral/10 text-base-content/70'
                        : 'bg-info/10 text-info'
                  }`}>
                    <div className="flex items-center gap-2">
                      {drawerPkg.status === 'installed' && <CheckIcon className="w-4 h-4" />}
                      {drawerPkg.status === 'built-in' && <InfoIcon className="w-4 h-4" />}
                      {drawerPkg.status === 'available' && <DownloadIcon className="w-4 h-4" />}
                      <span className="font-medium">
                        {drawerPkg.status === 'installed' && 'This package is installed'}
                        {drawerPkg.status === 'built-in' && 'This package is built-in'}
                        {drawerPkg.status === 'available' && 'This package is available for installation'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {drawerPkg.status === 'installed' && (
                      <>
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full"
                          onClick={() => handleUpdate(drawerPkg.name)}
                          disabled={isBusy}
                        >
                          {actionInProgress === `update-${drawerPkg.name}` ? (
                            <LoadingSpinner size="xs" />
                          ) : (
                            <UpdateIcon className="w-4 h-4" />
                          )}
                          Update Package
                        </Button>
                        <Button
                          variant="ghost"
                          size="md"
                          className="w-full text-error"
                          onClick={() => handleUninstall(drawerPkg.name)}
                          disabled={isBusy}
                        >
                          {actionInProgress === `uninstall-${drawerPkg.name}` ? (
                            <LoadingSpinner size="xs" />
                          ) : (
                            <UninstallIcon className="w-4 h-4" />
                          )}
                          Uninstall
                        </Button>
                      </>
                    )}
                    {drawerPkg.status === 'available' && (
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full"
                        onClick={() => {
                          setDrawerPkg(null);
                          setGithubUrl(drawerPkg.repoUrl || '');
                          setInstallModalOpen(true);
                        }}
                        disabled={isBusy}
                      >
                        <DownloadIcon className="w-4 h-4" />
                        Install Package
                      </Button>
                    )}
                    {drawerPkg.status === 'built-in' && (
                      <div className="text-center text-sm text-base-content/50 italic py-2">
                        Built-in packages are managed by open-hivemind
                      </div>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'details' && (
                <div className="space-y-4">
                  {/* Package Metadata */}
                  <div>
                    <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Package Name</label>
                    <p className="text-sm font-mono bg-base-200 rounded p-2">{drawerPkg.name}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Display Name</label>
                    <p className="text-sm">{drawerPkg.displayName}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Type</label>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${TYPE_COLOR_CLASSES[color]?.text ?? ''}`} />
                      <span className="text-sm capitalize">{drawerPkg.type}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Version</label>
                    <p className="text-sm">{drawerPkg.version}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Status</label>
                    <Badge variant={statusBadge.color} size="sm">{statusBadge.label}</Badge>
                  </div>

                  {drawerPkg.repoUrl && (
                    <div>
                      <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Repository</label>
                      <a
                        href={drawerPkg.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm link link-primary break-all"
                      >
                        {drawerPkg.repoUrl}
                      </a>
                    </div>
                  )}

                  {drawerPkg.installedAt && (
                    <div>
                      <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Installed At</label>
                      <p className="text-sm">{new Date(drawerPkg.installedAt).toLocaleString()}</p>
                    </div>
                  )}

                  {drawerPkg.updatedAt && (
                    <div>
                      <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Last Updated</label>
                      <p className="text-sm">{new Date(drawerPkg.updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </DetailDrawer>
    </div>
  );
};

export default MarketplacePage;
