/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit2, Trash2, ToggleLeft, AlertTriangle, Check, RefreshCw, AlertCircle, Save } from 'lucide-react';

interface GuardsConfig {
  type: 'owner' | 'users' | 'ip';
  users: string[];
  ips: string[];
}

interface Guard {
  id: string;
  name: string;
  description: string;
  type: 'content' | 'rate' | 'safety' | 'access';
  enabled: boolean;
  config: any;
}

const API_BASE = '/api';

const GuardsPage: React.FC = () => {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [accessConfig, setAccessConfig] = useState<GuardsConfig>({
    type: 'users',
    users: [],
    ips: [],
  });
  const [newUser, setNewUser] = useState('');
  const [newIp, setNewIp] = useState('');

  const fetchGuards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/guards`);
      if (!response.ok) {
        throw new Error('Failed to fetch guards');
      }
      const data = await response.json();

      if (data.success && data.guards) {
        setGuards(data.guards);

        // Update access config from the fetched data
        const accessGuard = data.guards.find((g: Guard) => g.id === 'access-control');
        if (accessGuard && accessGuard.config) {
             setAccessConfig({
                 type: accessGuard.config.type || 'users',
                 users: accessGuard.config.users || [],
                 ips: accessGuard.config.ips || []
             });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch guards';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuards();
  }, [fetchGuards]);

  const saveAccessControl = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE}/guards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessConfig),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save guards');
      }

      setSuccess('Access control saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save guards');
    } finally {
      setSaving(false);
    }
  };

  const toggleGuard = async (id: string) => {
    // Optimistic update
    const previousGuards = [...guards];
    const guardToToggle = guards.find(g => g.id === id);
    if (!guardToToggle) return;

    const newEnabledState = !guardToToggle.enabled;

    setGuards(guards.map(g => g.id === id ? { ...g, enabled: newEnabledState } : g));

    try {
        const response = await fetch(`${API_BASE}/guards/${id}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: newEnabledState }),
        });

        if (!response.ok) {
            throw new Error('Failed to toggle guard');
        }
    } catch (err) {
        // Revert on error
        setGuards(previousGuards);
        setError(err instanceof Error ? err.message : 'Failed to toggle guard');
    }
  };

  const addUser = () => {
    if (!newUser.trim()) { return; }
    setAccessConfig({
      ...accessConfig,
      users: [...accessConfig.users, newUser.trim()],
    });
    setNewUser('');
  };

  const removeUser = (user: string) => {
    setAccessConfig({
      ...accessConfig,
      users: accessConfig.users.filter(u => u !== user),
    });
  };

  const addIp = () => {
    if (!newIp.trim()) { return; }
    setAccessConfig({
      ...accessConfig,
      ips: [...accessConfig.ips, newIp.trim()],
    });
    setNewIp('');
  };

  const removeIp = (ip: string) => {
    setAccessConfig({
      ...accessConfig,
      ips: accessConfig.ips.filter(i => i !== ip),
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'access': return 'badge-primary';
      case 'rate': return 'badge-warning';
      case 'content': return 'badge-info';
      case 'safety': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="alert alert-warning">
        <AlertTriangle className="w-5 h-5" />
        <span>Work in Progress: This page is currently under development. Some features may not be fully functional.</span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="alert alert-success">
          <Check className="w-5 h-5" />
          <span>{success}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500 rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Guards</h1>
            <p className="text-base-content/60">Security and access control settings</p>
          </div>
        </div>
        <button onClick={fetchGuards} className="btn btn-ghost gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats stats-horizontal bg-base-200 w-full">
        <div className="stat">
          <div className="stat-title">Total Guards</div>
          <div className="stat-value text-primary">{guards.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Active</div>
          <div className="stat-value text-green-500">{guards.filter(g => g.enabled).length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Allowed Users</div>
          <div className="stat-value">{accessConfig.users.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Allowed IPs</div>
          <div className="stat-value">{accessConfig.ips.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <>
          {/* Guard List */}
          <div className="space-y-4">
            {guards.map(guard => (
              <div key={guard.id} className={`card bg-base-100 border shadow-sm ${guard.enabled ? 'border-base-300' : 'border-base-200 opacity-60'}`}>
                <div className="card-body py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        className="toggle toggle-success"
                        checked={guard.enabled}
                        onChange={() => toggleGuard(guard.id)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{guard.name}</h3>
                          <span className={`badge badge-sm ${getTypeColor(guard.type)}`}>{guard.type}</span>
                        </div>
                        <p className="text-sm text-base-content/60">{guard.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Access Control Config */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h2 className="card-title">Access Control Configuration</h2>

              <div className="form-control">
                <label className="label"><span className="label-text">Access Type</span></label>
                <select
                  className="select select-bordered w-full max-w-xs"
                  value={accessConfig.type}
                  onChange={(e) => setAccessConfig({ ...accessConfig, type: e.target.value as any })}
                >
                  <option value="owner">Owner Only</option>
                  <option value="users">Allowed Users</option>
                  <option value="ip">IP Whitelist</option>
                </select>
              </div>

              {/* Allowed Users */}
              <div className="form-control mt-4">
                <label className="label"><span className="label-text">Allowed Users</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="user@example.com"
                    className="input input-bordered flex-1"
                    value={newUser}
                    onChange={(e) => setNewUser(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addUser()}
                  />
                  <button className="btn btn-primary" onClick={addUser}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {accessConfig.users.map(user => (
                    <span key={user} className="badge badge-lg gap-2">
                      {user}
                      <button onClick={() => removeUser(user)} className="text-error">×</button>
                    </span>
                  ))}
                  {accessConfig.users.length === 0 && (
                    <span className="text-sm text-base-content/60 italic">No users added (this will allow anyone)</span>
                  )}
                </div>
              </div>

              {/* Allowed IPs */}
              <div className="form-control mt-4">
                <label className="label"><span className="label-text">Allowed IPs</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="192.168.1.0/24"
                    className="input input-bordered flex-1"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addIp()}
                  />
                  <button className="btn btn-primary" onClick={addIp}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {accessConfig.ips.map(ip => (
                    <span key={ip} className="badge badge-lg font-mono gap-2">
                      {ip}
                      <button onClick={() => removeIp(ip)} className="text-error">×</button>
                    </span>
                  ))}
                  {accessConfig.ips.length === 0 && (
                    <span className="text-sm text-base-content/50">No IPs added</span>
                  )}
                </div>
              </div>

              <div className="card-actions justify-end mt-6">
                <button
                  className="btn btn-primary gap-2"
                  onClick={saveAccessControl}
                  disabled={saving}
                >
                  {saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-4 h-4" />}
                  Save Access Control
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GuardsPage;
