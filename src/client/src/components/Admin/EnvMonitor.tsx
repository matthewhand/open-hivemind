/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import Badge from '../DaisyUI/Badge';
import { Alert } from '../DaisyUI/Alert';
import { SkeletonList } from '../DaisyUI/Skeleton';
import { getEnvOverrides } from '../../services/agentService';
import ResponsiveDataView from '../DaisyUI/ResponsiveDataView';

const EnvMonitor: React.FC = () => {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvOverrides = async () => {
    try {
      setLoading(true);
      const data = await getEnvOverrides();
      setEnvVars(data);
    } catch (err) {
      setError('Failed to fetch environment variable overrides');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnvOverrides();
  }, []);

  if (loading) {
    return <div className="min-h-[200px] p-4"><SkeletonList items={4} /></div>;
  }

  if (error) {
    return <Alert status="error" message={error} />;
  }

  return (
    <div className="card bg-base-100 shadow-xl p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Environment Variable Overrides</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchEnvOverrides}
          title="Refresh"
        >
          🔄 Refresh
        </button>
      </div>

      {Object.keys(envVars).length === 0 ? (
        <Alert status="info" message="No environment variable overrides detected" />
      ) : (
        <ResponsiveDataView
          data={Object.entries(envVars).map(([k, v]) => ({ variable: k, value: v }))}
          columns={[
            {
              key: 'variable' as any,
              title: 'Environment Variable',
              prominent: true,
              render: (v: string) => <code className="badge badge-outline font-mono text-xs">{v}</code>,
            },
            {
              key: 'value' as any,
              title: 'Value',
              render: (v: string) => (
                <Badge variant="primary">
                  <code className="font-mono text-xs">{v}</code>
                </Badge>
              ),
            },
          ]}
          rowKey={(row: any) => row.variable}
        />
      )}
    </div>
  );
};

export default EnvMonitor;