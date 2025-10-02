import React, { useState, useEffect } from 'react';
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
    } catch {
      setError('Failed to fetch environment variable overrides');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnvOverrides();
  }, []);

  if (loading) {
    return <p className="text-base">Loading environment variables...</p>;
  }

  if (error) {
    return <p className="text-error text-base">{error}</p>;
  }

  return (
    <div className="card bg-base-100 shadow-xl p-4 mt-6">
      <h3 className="card-title text-lg mb-4">
        Environment Variable Overrides
      </h3>

      {Object.keys(envVars).length === 0 ? (
        <p className="text-base">No environment variable overrides detected</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="text-left">Environment Variable</th>
                <th className="text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(envVars).map(([key, value]) => (
                <tr key={key}>
                  <td>
                    <div className="badge badge-neutral font-mono text-xs">
                      {key}
                    </div>
                  </td>
                  <td>
                    <div className="badge badge-primary font-mono text-xs">
                      {value}
                    </div>
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