import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/DaisyUI/Card';
import Badge from '../components/DaisyUI/Badge';
import Button from '../components/DaisyUI/Button';
import EmptyState from '../components/DaisyUI/EmptyState';
import PageHeader from '../components/DaisyUI/PageHeader';
import Tabs from '../components/DaisyUI/Tabs';
import { SkeletonGrid } from '../components/DaisyUI/Skeleton';
import { Alert } from '../components/DaisyUI/Alert';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Clock,
  Lock,
  Unlock,
} from 'lucide-react';
import { ConfirmModal } from '../components/DaisyUI/Modal';

interface PluginSecurityStatus {
  pluginName: string;
  trustLevel: 'trusted' | 'untrusted';
  isBuiltIn: boolean;
  signatureValid: boolean | null;
  grantedCapabilities: string[];
  deniedCapabilities: string[];
  requiredCapabilities: string[];
}

type SecurityFilter = 'all' | 'trusted' | 'untrusted' | 'built-in' | 'verification-failed';

const PluginSecurityPage: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginSecurityStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SecurityFilter>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchPluginSecurity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/plugins/security');
      if (!response.ok) throw new Error('Failed to fetch plugin security status');
      const data = await response.json();
      setPlugins(data.data?.plugins || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load plugin security status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPluginSecurity();
  }, [fetchPluginSecurity]);

  const handleVerifyPlugin = async (pluginName: string) => {
    setActionInProgress(pluginName);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`/api/admin/plugins/${pluginName}/verify`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to verify plugin');
      const data = await response.json();
      setSuccessMessage(`Plugin '${pluginName}' verified successfully`);
      await fetchPluginSecurity();
    } catch (err: any) {
      setError(err.message || 'Failed to verify plugin');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleTrustPlugin = async (pluginName: string, trust: boolean) => {
    setActionInProgress(pluginName);
    setError(null);
    setSuccessMessage(null);
    try {
      const plugin = plugins.find((p) => p.pluginName === pluginName);
      const capabilities = trust && plugin ? plugin.requiredCapabilities : [];

      const response = await fetch(`/api/admin/plugins/${pluginName}/trust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trust, capabilities }),
      });
      if (!response.ok) throw new Error('Failed to update plugin trust');
      const data = await response.json();
      setSuccessMessage(
        trust
          ? `Plugin '${pluginName}' marked as trusted`
          : `Plugin '${pluginName}' marked as untrusted`
      );
      await fetchPluginSecurity();
    } catch (err: any) {
      setError(err.message || 'Failed to update plugin trust');
    } finally {
      setActionInProgress(null);
    }
  };

  const openTrustConfirmModal = (pluginName: string, trust: boolean) => {
    setConfirmModal({
      isOpen: true,
      title: trust ? 'Trust Plugin' : 'Revoke Trust',
      message: trust
        ? `Are you sure you want to trust the plugin '${pluginName}'? This will grant it the requested capabilities.`
        : `Are you sure you want to revoke trust from '${pluginName}'? This will remove all granted capabilities.`,
      onConfirm: () => {
        handleTrustPlugin(pluginName, trust);
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  const filteredPlugins = plugins.filter((plugin) => {
    switch (filter) {
      case 'trusted':
        return plugin.trustLevel === 'trusted';
      case 'untrusted':
        return plugin.trustLevel === 'untrusted';
      case 'built-in':
        return plugin.isBuiltIn;
      case 'verification-failed':
        return plugin.signatureValid === false;
      default:
        return true;
    }
  });

  const getSignatureStatusBadge = (signatureValid: boolean | null) => {
    if (signatureValid === null) {
      return <Badge color="neutral" size="sm">No Signature</Badge>;
    } else if (signatureValid) {
      return <Badge color="success" size="sm"><CheckCircle className="w-3 h-3 mr-1" />Valid</Badge>;
    } else {
      return <Badge color="error" size="sm"><XCircle className="w-3 h-3 mr-1" />Invalid</Badge>;
    }
  };

  const getTrustBadge = (trustLevel: 'trusted' | 'untrusted', isBuiltIn: boolean) => {
    if (isBuiltIn) {
      return <Badge color="info" size="sm"><ShieldCheck className="w-3 h-3 mr-1" />Built-in</Badge>;
    } else if (trustLevel === 'trusted') {
      return <Badge color="success" size="sm"><ShieldCheck className="w-3 h-3 mr-1" />Trusted</Badge>;
    } else {
      return <Badge color="warning" size="sm"><ShieldAlert className="w-3 h-3 mr-1" />Untrusted</Badge>;
    }
  };

  const stats = {
    total: plugins.length,
    trusted: plugins.filter((p) => p.trustLevel === 'trusted').length,
    untrusted: plugins.filter((p) => p.trustLevel === 'untrusted').length,
    builtIn: plugins.filter((p) => p.isBuiltIn).length,
    verificationFailed: plugins.filter((p) => p.signatureValid === false).length,
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <PageHeader
        title="Plugin Security Dashboard"
        description="Monitor and manage security settings for all installed plugins"
        icon={Shield}
        gradient="warning"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="bg-base-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-base-content/70">Total Plugins</div>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="bg-base-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-success">{stats.trusted}</div>
              <div className="text-sm text-base-content/70">Trusted</div>
            </div>
            <ShieldCheck className="w-8 h-8 text-success" />
          </div>
        </Card>

        <Card className="bg-base-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-warning">{stats.untrusted}</div>
              <div className="text-sm text-base-content/70">Untrusted</div>
            </div>
            <ShieldAlert className="w-8 h-8 text-warning" />
          </div>
        </Card>

        <Card className="bg-base-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-info">{stats.builtIn}</div>
              <div className="text-sm text-base-content/70">Built-in</div>
            </div>
            <Lock className="w-8 h-8 text-info" />
          </div>
        </Card>

        <Card className="bg-base-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-error">{stats.verificationFailed}</div>
              <div className="text-sm text-base-content/70">Failed Verification</div>
            </div>
            <ShieldOff className="w-8 h-8 text-error" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold">Filter by:</span>
          <Tabs
            tabs={[
              { key: 'all', label: 'All' },
              { key: 'trusted', label: 'Trusted' },
              { key: 'untrusted', label: 'Untrusted' },
              { key: 'built-in', label: 'Built-in' },
              { key: 'verification-failed', label: 'Verification Failed' },
            ]}
            activeTab={filter}
            onChange={(key) => setFilter(key as SecurityFilter)}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchPluginSecurity}
            disabled={loading}
            aria-label="Refresh plugin security status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* Messages */}
      {error && (
        <Alert status="error" className="mb-4">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </Alert>
      )}

      {successMessage && (
        <Alert status="success" className="mb-4" onClose={() => setSuccessMessage(null)}>
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </Alert>
      )}

      {/* Plugin List */}
      {loading ? (
        <SkeletonGrid count={3} />
      ) : filteredPlugins.length === 0 ? (
        <EmptyState
          icon={ShieldOff}
          title="No plugins found"
          description={filter === 'all' ? 'No plugins are currently installed' : `No plugins match the '${filter}' filter`}
          variant={filter === 'all' ? 'noData' : 'noResults'}
          className="py-12"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPlugins.map((plugin) => (
            <Card key={plugin.pluginName} className="hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">{plugin.pluginName}</h3>
                    {getTrustBadge(plugin.trustLevel, plugin.isBuiltIn)}
                    {getSignatureStatusBadge(plugin.signatureValid)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="font-semibold text-base-content/70 mb-1">
                        Granted Capabilities
                      </div>
                      {plugin.grantedCapabilities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {plugin.grantedCapabilities.map((cap) => (
                            <Badge key={cap} color="success" size="sm">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-base-content/50">None</span>
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-base-content/70 mb-1">
                        Denied Capabilities
                      </div>
                      {plugin.deniedCapabilities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {plugin.deniedCapabilities.map((cap) => (
                            <Badge key={cap} color="error" size="sm">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-base-content/50">None</span>
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-base-content/70 mb-1">
                        Required Capabilities
                      </div>
                      {plugin.requiredCapabilities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {plugin.requiredCapabilities.map((cap) => (
                            <Badge key={cap} color="neutral" size="sm">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-base-content/50">None</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:w-48">
                  {!plugin.isBuiltIn && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerifyPlugin(plugin.pluginName)}
                        disabled={actionInProgress === plugin.pluginName}
                        aria-label={`Verify ${plugin.pluginName}`}
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-2 ${
                            actionInProgress === plugin.pluginName ? 'animate-spin' : ''
                          }`}
                        />
                        Re-verify
                      </Button>

                      {plugin.trustLevel === 'untrusted' ? (
                        <Button
                          size="sm"
                          color="success"
                          onClick={() => openTrustConfirmModal(plugin.pluginName, true)}
                          disabled={actionInProgress === plugin.pluginName}
                          aria-label={`Trust ${plugin.pluginName}`}
                        >
                          <Unlock className="w-4 h-4 mr-2" />
                          Trust Plugin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          color="warning"
                          onClick={() => openTrustConfirmModal(plugin.pluginName, false)}
                          disabled={actionInProgress === plugin.pluginName}
                          aria-label={`Revoke trust from ${plugin.pluginName}`}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Revoke Trust
                        </Button>
                      )}
                    </>
                  )}
                  {plugin.isBuiltIn && (
                    <div className="text-xs text-base-content/50 text-center py-2">
                      Built-in plugins are always trusted
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
};

export default PluginSecurityPage;
