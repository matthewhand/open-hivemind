import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import { Alert } from '../components/DaisyUI/Alert';
import Input from '../components/DaisyUI/Input';
import {
  Store as StoreIcon,
  Download as DownloadIcon,
  RefreshCw as UpdateIcon,
  Trash2 as UninstallIcon,
  Search as SearchIcon,
  Brain as LLMIcon,
  MessageCircle as MessageIcon,
  Database as MemoryIcon,
  Wrench as ToolIcon,
  Github as GitHubIcon,
  AlertCircle as AlertIcon,
  CheckCircle as CheckIcon,
} from 'lucide-react';

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
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch packages
  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/marketplace/packages');
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load marketplace');
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
      setActionInProgress(null);
    }
  };

  // Update package
  const handleUpdate = async (name: string) => {
    setActionInProgress(`update-${name}`);
    setActionMessage(null);

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
      setActionInProgress(null);
    }
  };

  // Uninstall package
  const handleUninstall = async (name: string) => {
    if (!confirm(`Are you sure you want to uninstall ${name}?`)) return;

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
  };

  return (
    <div className="p-6">
      {/* Alert Messages */}
      {actionMessage && (
        <Alert
          status={actionMessage.type}
          icon={actionMessage.type === 'success' ? <CheckIcon className="w-5 h-5" /> : <AlertIcon className="w-5 h-5" />}
          className="mb-4"
          onClose={() => setActionMessage(null)}
        >
          <span>{actionMessage.text}</span>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert
          status="error"
          icon={<AlertIcon className="w-5 h-5" />}
          className="mb-4"
        >
          <span>{error}</span>
          <Button variant="ghost" size="xs" onClick={fetchPackages}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <Input
            placeholder="Search packages..."
            prefix={<SearchIcon className="w-5 h-5" />}
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
      )}

      {/* Install from URL Modal */}
      {installModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Install Package from GitHub</h3>

            <Input
              label="GitHub Repository URL"
              placeholder="https://github.com/user/provider-package"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              helperText="Enter the full GitHub URL of the provider package"
            />

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
