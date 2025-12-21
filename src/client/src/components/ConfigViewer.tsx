import React, { useEffect, useState } from 'react';
import { Alert, Loading, Badge, Input, Accordion } from './DaisyUI';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import type { ConfigResponse, ConfigSourcesResponse } from '../services/api';

const ConfigViewer: React.FC = () => {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [sources, setSources] = useState<ConfigSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configData, sourcesData] = await Promise.all([
          apiService.getConfig(),
          apiService.getConfigSources(),
        ]);
        setConfig(configData);
        setSources(sourcesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filterConfig = (data: any, term: string): any => {
    if (!term) return data;

    const filterObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.toLowerCase().includes(term.toLowerCase()) ? obj : null;
      }
      if (typeof obj === 'object' && obj !== null) {
        const filtered: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key.toLowerCase().includes(term.toLowerCase())) {
            filtered[key] = value;
          } else {
            const filteredValue = filterObject(value);
            if (filteredValue !== null) {
              filtered[key] = filteredValue;
            }
          }
        }
        return Object.keys(filtered).length > 0 ? filtered : null;
      }
      return null;
    };

    return filterObject(data);
  };

  const renderConfigTree = (data: any, path = ''): React.ReactNode => {
    if (data === null) return null;

    if (typeof data === 'object' && !Array.isArray(data)) {
      return (
        <Accordion>
          {Object.entries(data).map(([key, value]) => (
            <Accordion.Item key={path + key} value={path + key}>
              <Accordion.Trigger>
                <span className="font-bold">{key}</span>
              </Accordion.Trigger>
              <Accordion.Content>
                {renderConfigTree(value, path + key + '.')}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      );
    }

    if (Array.isArray(data)) {
      return (
        <ul className="space-y-2">
          {data.map((item, index) => (
            <li key={index} className="text-sm">
              {JSON.stringify(item, null, 2)}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p className="text-sm font-mono">
        {typeof data === 'string' ? `"${data}"` : JSON.stringify(data)}
      </p>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl mt-8">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  const filteredConfig = config ? filterConfig(config, searchTerm) : null;

  return (
    <div className="container mx-auto max-w-6xl mt-8 mb-8 px-4">
      <h1 className="text-3xl font-bold mb-6">
        Configuration Viewer
      </h1>

      <div className="mb-6">
        <Input
          placeholder="Search configuration..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          iconLeft={<MagnifyingGlassIcon className="w-5 h-5" />}
        />
      </div>

      {config && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Configuration Overview
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="primary">Environment: {config.environment}</Badge>
            <Badge variant={config.legacyMode ? 'warning' : 'success'}>
              Legacy Mode: {config.legacyMode ? 'Yes' : 'No'}
            </Badge>
            <Badge variant="info">Bots: {config.bots.length}</Badge>
          </div>
          {config.warnings.length > 0 && (
            <Alert variant="warning">
              <h3 className="font-semibold mb-2">Warnings:</h3>
              <ul className="list-disc list-inside">
                {config.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}
        </div>
      )}

      {filteredConfig && (
        <div className="bg-base-200 p-4 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Configuration Tree
          </h2>
          {renderConfigTree(filteredConfig)}
        </div>
      )}

      {sources && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Configuration Sources
          </h2>

          <Accordion>
            <Accordion.Item value="env">
              <Accordion.Trigger>
                Environment Variables ({Object.keys(sources.environmentVariables).length})
              </Accordion.Trigger>
              <Accordion.Content>
                <ul className="space-y-2">
                  {Object.entries(sources.environmentVariables).map(([key, value]: [string, any]) => (
                    <li key={key} className="border-b border-base-300 pb-2">
                      <div className="font-semibold">{key}</div>
                      <div className="text-sm text-base-content/70">
                        Source: {value.source}
                        {value.sensitive && (
                          <Badge variant="warning" size="sm" className="ml-2">
                            Sensitive
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="files">
              <Accordion.Trigger>
                Configuration Files ({sources.configFiles.length})
              </Accordion.Trigger>
              <Accordion.Content>
                <ul className="space-y-2">
                  {sources.configFiles.map((file: any, index: number) => (
                    <li key={index} className="border-b border-base-300 pb-2">
                      <div className="font-semibold">{file.name}</div>
                      <div className="text-sm text-base-content/70">
                        Type: {file.type} | Size: {file.size} bytes
                        <span className="ml-2">
                          Modified: {new Date(file.modified).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="overrides">
              <Accordion.Trigger>
                Overrides ({sources.overrides.length})
              </Accordion.Trigger>
              <Accordion.Content>
                <ul className="space-y-2">
                  {sources.overrides.map((override: any, index: number) => (
                    <li key={index} className="border-b border-base-300 pb-2">
                      <div className="font-semibold">{override.key}</div>
                      <div className="text-sm text-base-content/70">
                        Bot: {override.bot} | Type: {override.type}
                        {override.value && (
                          <span className="ml-2">
                            Value: {override.value}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </div>
      )}
    </div>
  );
};

export default ConfigViewer;