import React, { useState } from 'react';
import { useEnterprise } from './EnterpriseContext';
import { AlertTriangle, Plus } from 'lucide-react';

const LicensePanel: React.FC = () => {
  const { complianceRules, cloudProviders, loading, error, handleAddCloudProvider } = useEnterprise();

  const [addCloudProviderDialog, setAddCloudProviderDialog] = useState(false);
  const [cloudForm, setCloudForm] = useState({
    name: '',
    type: 'aws' as any,
    region: '',
    credentials: {},
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
      case 'compliant':
        return 'badge-success';
      case 'inactive':
      case 'disconnected':
      case 'non-compliant':
        return 'badge-error';
      case 'configuring':
      case 'checking':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'badge-error';
      case 'high':
        return 'badge-warning';
      case 'medium':
        return 'badge-info';
      case 'low':
        return 'badge-success';
      default:
        return 'badge-ghost';
    }
  };

  const onSubmitCloudProvider = async () => {
    await handleAddCloudProvider(cloudForm);
    setAddCloudProviderDialog(false);
    setCloudForm({ name: '', type: 'aws', region: '', credentials: {} });
  };

  return (
    <div className="space-y-8">
      {/* Security & Compliance Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Compliance Rules & Security</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {complianceRules.map((rule) => (
            <div key={rule.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="card-title text-base">{rule.name}</h3>
                    <p className="text-sm text-base-content/70">{rule.category}</p>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    <div className={`badge ${getSeverityColor(rule.severity)} badge-sm`}>
                      {rule.severity}
                    </div>
                    <div className={`badge ${getStatusColor(rule.status)} badge-sm`}>
                      {rule.status}
                    </div>
                  </div>
                </div>
                <p className="text-sm mb-2">{rule.description}</p>
                {rule.remediation && (
                  <div className="alert alert-warning text-sm py-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{rule.remediation}</span>
                  </div>
                )}
                <div className="text-xs text-base-content/50 mt-2">
                  Last checked: {new Date(rule.lastChecked).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Cloud Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Cloud Providers (License Usage)</h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setAddCloudProviderDialog(true)}
            disabled={loading} aria-busy={loading}
            aria-label="Add a new cloud provider"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Provider
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cloudProviders.map((provider) => (
            <div key={provider.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="card-title text-base">{provider.name}</h3>
                    <p className="text-sm text-base-content/70">
                      {provider.type.toUpperCase()} • {provider.region}
                    </p>
                  </div>
                  <div className={`badge ${getStatusColor(provider.status)}`}>
                    {provider.status}
                  </div>
                </div>
                <p className="text-sm font-semibold mb-1">Resources:</p>
                <div className="flex flex-wrap gap-1">
                  {provider.resources.map((resource, index) => (
                    <div key={index} className="badge badge-outline badge-sm">
                      {resource.type}: {resource.count}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Cloud Provider Dialog */}
      <dialog className={`modal ${addCloudProviderDialog ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Add Cloud Provider</h3>
          <div className="form-control w-full mb-4">
            <label htmlFor="cloud-provider-name" className="label">
              <span className="label-text">Provider Name</span>
            </label>
            <input
              id="cloud-provider-name"
              type="text"
              className="input input-bordered w-full"
              value={cloudForm.name}
              onChange={(e) => setCloudForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-control w-full mb-4">
            <label htmlFor="cloud-type" className="label">
              <span className="label-text">Cloud Type</span>
            </label>
            <select
              id="cloud-type"
              className="select select-bordered w-full"
              value={cloudForm.type}
              onChange={(e) =>
                setCloudForm((prev) => ({ ...prev, type: e.target.value as any }))
              }
            >
              <option value="aws">Amazon Web Services</option>
              <option value="azure">Microsoft Azure</option>
              <option value="gcp">Google Cloud Platform</option>
              <option value="digitalocean">DigitalOcean</option>
              <option value="heroku">Heroku</option>
            </select>
          </div>
          <div className="form-control w-full mb-4">
            <label htmlFor="cloud-region" className="label">
              <span className="label-text">Region</span>
            </label>
            <input
              id="cloud-region"
              type="text"
              className="input input-bordered w-full"
              value={cloudForm.region}
              onChange={(e) => setCloudForm((prev) => ({ ...prev, region: e.target.value }))}
            />
          </div>
          <div className="modal-action">
            <button className="btn" onClick={() => setAddCloudProviderDialog(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={onSubmitCloudProvider}
              disabled={loading || !cloudForm.name.trim() || !cloudForm.region.trim()}
            >
              {loading ? 'Adding...' : 'Add Provider'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setAddCloudProviderDialog(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default LicensePanel;
