/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Badge, Alert, Button, Modal } from '../DaisyUI';
import {
  CpuChipIcon,
  ArrowPathIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
<<<<<<< HEAD
import type { BotConfig } from '../../../../types/config';
=======
import { BotConfig as BaseBotConfig } from '../../../../types/config';
>>>>>>> origin/main

interface RedactedValue {
    isRedacted: boolean;
    redactedValue: string;
    hasValue: boolean;
}

<<<<<<< HEAD
interface BotConfigExtended extends Omit<BotConfig, 'discord' | 'slack' | 'isActive'> {
=======
type BotConfig = BaseBotConfig & {
>>>>>>> origin/main
    isActive: boolean;
    source: string;
    discord?: Record<string, unknown | RedactedValue>;
    slack?: Record<string, unknown | RedactedValue>;
<<<<<<< HEAD
}
=======
    llmProfile?: string;
    persona?: string;
    [key: string]: unknown;
};
>>>>>>> origin/main

interface BotListResponse {
    bots: BotConfigExtended[];
    count: number;
    warnings: string[];
}

const BotListManager: React.FC = () => {
  const [bots, setBots] = useState<BotConfigExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedBot, setSelectedBot] = useState<BotConfigExtended | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/config/bots');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch bots');
      }
      const data: BotListResponse = await res.json();
      setBots(data.bots || []);
      setWarnings(data.warnings || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBot = (bot: BotConfigExtended) => {
    setSelectedBot(bot);
    setIsModalOpen(true);
  };

  const getProviderBadgeColor = (provider: string): string => {
    switch (provider) {
    case 'discord': return 'badge-primary';
    case 'slack': return 'badge-secondary';
    case 'mattermost': return 'badge-info';
    default: return 'badge-ghost';
    }
  };

  const renderConfigValue = (key: string, value: unknown): React.ReactNode => {
    if (!value) {return <span className="text-base-content/40">—</span>;}

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (obj.isRedacted) {
        return (
          <div className="flex items-center gap-1 text-base-content/60 italic">
            <EyeSlashIcon className="w-3 h-3" />
            <span>Redacted</span>
          </div>
        );
      }
      return <pre className="text-xs bg-base-300 p-2 rounded overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
    }

    return String(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CpuChipIcon className="w-6 h-6 text-primary" />
          Bot Configurations
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchBots}
            loading={loading}
          >
            <ArrowPathIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <ExclamationCircleIcon className="w-5 h-5" />
          <span>{error}</span>
        </Alert>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, idx) => (
            <Alert key={idx} variant="warning" size="sm">
              <ExclamationCircleIcon className="w-4 h-4" />
              <span>{warning}</span>
            </Alert>
          ))}
        </div>
      )}

      <div className="overflow-x-auto bg-base-100 rounded-lg border border-base-300">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Status</th>
              <th>Bot Name</th>
              <th>Messaging</th>
              <th>LLM</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <span className="loading loading-spinner loading-md"></span>
                </td>
              </tr>
            ) : bots.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-base-content/50">
                  No bot configurations found.
                </td>
              </tr>
            ) : (
              bots.map((bot) => (
                <tr key={bot.name} className="hover:bg-base-200/50">
                  <td>
                    {bot.isActive ? (
                      <div className="tooltip" data-tip="Active">
                        <CheckCircleIcon className="w-5 h-5 text-success" />
                      </div>
                    ) : (
                      <div className="tooltip" data-tip="Inactive">
                        <ExclamationCircleIcon className="w-5 h-5 text-base-content/20" />
                      </div>
                    )}
                  </td>
                  <td className="font-medium">{bot.name}</td>
                  <td>
                    <Badge variant="ghost" className={getProviderBadgeColor(bot.messageProvider)}>
                      {bot.messageProvider}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{bot.llmProvider}</span>
                      {bot.llmProfile && (
                        <span className="text-[10px] opacity-60">Profile: {bot.llmProfile}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge variant="outline" size="sm" className="opacity-60">
                      {bot.source}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleViewBot(bot)}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bot Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Configuration: ${selectedBot?.name}`}
        size="lg"
      >
        {selectedBot && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">Core Settings</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm border-b border-base-200 py-1">
                    <span className="opacity-60">Provider</span>
                    <span className="font-medium">{selectedBot.messageProvider}</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-base-200 py-1">
                    <span className="opacity-60">LLM Provider</span>
                    <span className="font-medium">{selectedBot.llmProvider}</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-base-200 py-1">
                    <span className="opacity-60">LLM Profile</span>
                    <span className="font-medium">{selectedBot.llmProfile || 'Default'}</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-base-200 py-1">
                    <span className="opacity-60">Persona</span>
                    <span className="font-medium">{selectedBot.persona || 'None'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">Infrastructure</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm border-b border-base-200 py-1">
                    <span className="opacity-60">Source</span>
                    <span className="font-medium uppercase text-xs">{selectedBot.source}</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-base-200 py-1">
                    <span className="opacity-60">Active Status</span>
                    <Badge variant={selectedBot.isActive ? 'success' : 'ghost'} size="sm">
                      {selectedBot.isActive ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Config Sections */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">Provider Configuration</h3>
              
              {selectedBot.discord && (
                <div className="collapse collapse-arrow bg-base-200/50">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium flex items-center gap-2">
                    Discord Settings
                  </div>
                  <div className="collapse-content">
                    <div className="space-y-2 pt-2">
                      {Object.entries(selectedBot.discord).map(([key, val]) => (
                        <div key={key} className="space-y-1">
                          <label className="text-[10px] uppercase font-bold opacity-40">{key}</label>
                          <div className="text-sm">{renderConfigValue(key, val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedBot.slack && (
                <div className="collapse collapse-arrow bg-base-200/50">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium flex items-center gap-2">
                    Slack Settings
                  </div>
                  <div className="collapse-content">
                    <div className="space-y-2 pt-2">
                      {Object.entries(selectedBot.slack).map(([key, val]) => (
                        <div key={key} className="space-y-1">
                          <label className="text-[10px] uppercase font-bold opacity-40">{key}</label>
                          <div className="text-sm">{renderConfigValue(key, val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Catch-all for other config keys */}
              <div className="collapse collapse-arrow bg-base-200/50">
                <input type="checkbox" />
                <div className="collapse-title font-medium">
                  Additional Parameters
                </div>
                <div className="collapse-content">
                  <div className="space-y-2 pt-2">
                    {Object.entries(selectedBot)
                      .filter(([key]) => !['name', 'isActive', 'source', 'discord', 'slack', 'messageProvider', 'llmProvider', 'llmProfile', 'persona'].includes(key))
                      .map(([key, val]) => (
                        <div key={key} className="space-y-1">
                          <label className="text-[10px] uppercase font-bold opacity-40">{key}</label>
                          <div className="text-sm">{renderConfigValue(key, val)}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-action">
              <Button onClick={() => setIsModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BotListManager;
