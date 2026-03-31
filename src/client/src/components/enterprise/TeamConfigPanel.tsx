import React, { useState } from 'react';
import { useEnterprise } from './EnterpriseContext';
import { Plus } from 'lucide-react';

const TeamConfigPanel: React.FC = () => {
  const { integrations, loading, handleAddIntegration } = useEnterprise();

  const [addIntegrationDialog, setAddIntegrationDialog] = useState(false);
  const [integrationForm, setIntegrationForm] = useState({
    name: '',
    type: 'webhook' as any,
    provider: '',
    config: {},
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'inactive':
      case 'error':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  const onSubmitIntegration = async () => {
    await handleAddIntegration(integrationForm);
    setAddIntegrationDialog(false);
    setIntegrationForm({ name: '', type: 'webhook', provider: '', config: {} });
  };

  return (
    <div className="space-y-8">
      {/* Integrations Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Team Integrations</h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setAddIntegrationDialog(true)}
            disabled={loading} aria-busy={loading}
            aria-label="Add a new enterprise integration"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Integration
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="card-title text-base">{integration.name}</h3>
                    <p className="text-sm text-base-content/70">
                      {integration.provider} • {integration.type}
                    </p>
                  </div>
                  <div className={`badge ${getStatusColor(integration.status)} badge-sm`}>
                    {integration.status}
                  </div>
                </div>
                <p className="text-sm mb-2">
                  Last sync: {new Date(integration.lastSync).toLocaleString()}
                </p>
                <div className="card-actions justify-end">
                  <button className="btn btn-xs btn-outline" aria-label={`Configure ${integration.name}`}>Configure</button>
                  <button className="btn btn-xs btn-outline" aria-label={`Test ${integration.name}`}>Test</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Integration Dialog */}
      <dialog className={`modal ${addIntegrationDialog ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Add Integration</h3>
          <div className="form-control w-full mb-4">
            <label htmlFor="integration-name" className="label">
              <span className="label-text">Integration Name</span>
            </label>
            <input
              id="integration-name"
              type="text"
              className="input input-bordered w-full"
              value={integrationForm.name}
              onChange={(e) => setIntegrationForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-control w-full mb-4">
            <label htmlFor="integration-type" className="label">
              <span className="label-text">Type</span>
            </label>
            <select
              id="integration-type"
              className="select select-bordered w-full"
              value={integrationForm.type}
              onChange={(e) =>
                setIntegrationForm((prev) => ({
                  ...prev,
                  type: e.target.value as any,
                }))
              }
            >
              <option value="webhook">Webhook</option>
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="monitoring">Monitoring</option>
              <option value="logging">Logging</option>
            </select>
          </div>
          <div className="form-control w-full mb-4">
            <label htmlFor="integration-provider" className="label">
              <span className="label-text">Provider</span>
            </label>
            <input
              id="integration-provider"
              type="text"
              className="input input-bordered w-full"
              value={integrationForm.provider}
              onChange={(e) =>
                setIntegrationForm((prev) => ({ ...prev, provider: e.target.value }))
              }
            />
          </div>
          <div className="modal-action">
            <button className="btn" onClick={() => setAddIntegrationDialog(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={onSubmitIntegration}
              disabled={loading || !integrationForm.name.trim() || !integrationForm.provider.trim()}
            >
              {loading ? 'Adding...' : 'Add Integration'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setAddIntegrationDialog(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default TeamConfigPanel;
