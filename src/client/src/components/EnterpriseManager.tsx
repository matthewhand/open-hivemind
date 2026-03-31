import React, { useState } from 'react';
import { RefreshCw, BarChart3, CheckCircle2, Cloud, AlertCircle, ShieldCheck, Users } from 'lucide-react';
import { EnterpriseProvider, useEnterprise } from './enterprise/EnterpriseContext';
import LicensePanel from './enterprise/LicensePanel';
import UsageAnalyticsPanel from './enterprise/UsageAnalyticsPanel';
import TeamConfigPanel from './enterprise/TeamConfigPanel';

const EnterpriseManagerContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { loading, error, success, setError, setSuccess, loadEnterpriseData } = useEnterprise();

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <LicensePanel />;
      case 1:
        return <UsageAnalyticsPanel />;
      case 2:
        return <TeamConfigPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Enterprise Manager</h1>
        <button className="btn btn-outline" onClick={loadEnterpriseData} disabled={loading} aria-busy={loading} aria-label="Refresh enterprise data">
          <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-sm btn-ghost" aria-label="Close error message">✕</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <CheckCircle2 className="w-6 h-6" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="btn btn-sm btn-ghost" aria-label="Close success message">✕</button>
        </div>
      )}

      <div className="tabs tabs-boxed mb-6 bg-base-200 p-1">
        <a className={`tab ${activeTab === 0 ? 'tab-active' : ''}`} onClick={() => setActiveTab(0)}>
          <ShieldCheck className="w-4 h-4 mr-2" /> License & Security
        </a>
        <a className={`tab ${activeTab === 1 ? 'tab-active' : ''}`} onClick={() => setActiveTab(1)}>
          <BarChart3 className="w-4 h-4 mr-2" /> Usage Analytics
        </a>
        <a className={`tab ${activeTab === 2 ? 'tab-active' : ''}`} onClick={() => setActiveTab(2)}>
          <Users className="w-4 h-4 mr-2" /> Team & Integrations
        </a>
      </div>

      {renderTabContent()}
    </div>
  );
};

const EnterpriseManager: React.FC = () => (
  <EnterpriseProvider>
    <EnterpriseManagerContent />
  </EnterpriseProvider>
);

export default EnterpriseManager;
