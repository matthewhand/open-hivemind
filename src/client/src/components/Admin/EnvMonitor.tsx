import React, { useState, useEffect } from 'react';
import { Badge, Alert, Loading } from '../DaisyUI';
import { getEnvOverrides } from '../services/agentService';

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
    return <Loading />;
  }

  if (error) {
    return <Alert type="error">{error}</Alert>;
  }

  return (
    <div className="card bg-base-100 shadow-xl p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">Environment Variable Overrides</h2>

      {Object.keys(envVars).length === 0 ? (
        <Alert type="info">No environment variable overrides detected</Alert>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Environment Variable</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(envVars).map(([key, value]) => (
                <tr key={key}>
                  <td>
                    <code className="badge badge-outline font-mono text-xs">{key}</code>
                  </td>
                  <td>
                    <Badge color="primary">
                      <code className="font-mono text-xs">{value}</code>
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EnvMonitor;