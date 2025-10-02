import React, { useState } from 'react';
import {
  Card,
  Badge,
  LinearProgress,
  Button,
  Modal,
  Accordion,
} from './DaisyUI';
import type { Bot } from '../services/api';

interface BotStatusCardProps {
  bot: Bot;
  statusData?: {
    status: string;
    healthDetails?: Record<string, unknown>;
    connected?: boolean;
    messageCount?: number;
    errorCount?: number;
    lastActivity?: string;
    uptime?: number;
    responseTime?: number;
  };
  onRefresh?: () => void;
}

const BotStatusCard: React.FC<BotStatusCardProps> = ({
  bot,
  statusData,
  onRefresh
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'connected':
        return '✅';
      case 'error':
      case 'disconnected':
        return '❌';
      case 'warning':
      case 'connecting':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'connected':
        return 'success';
      case 'error':
      case 'disconnected':
        return 'error';
      case 'warning':
      case 'connecting':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'discord':
        return '🤖';
      case 'slack':
        return '💬';
      case 'mattermost':
        return '📱';
      default:
        return '🔧';
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatResponseTime = (ms: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getHealthScore = () => {
    if (!statusData) return 0;

    let score = 100;
    if (statusData.status !== 'active') score -= 30;
    if (statusData.errorCount && statusData.errorCount > 0) score -= 20;
    if (statusData.responseTime && statusData.responseTime > 2000) score -= 15;
    if (!statusData.connected) score -= 25;

    return Math.max(0, score);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const healthScore = getHealthScore();

  return (
    <>
      <Card className="min-w-[350px] transition-all duration-200 ease-in-out hover:-translate-y-0.5 shadow-xl">
        <div className="card-body">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">
                {getProviderIcon(bot.messageProvider)} {bot.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStatusIcon(statusData?.status || 'unknown')}</span>
              <Badge size="small" variant={getStatusColor(statusData?.status || 'unknown')}>
                {statusData?.status || 'unknown'}
              </Badge>
            </div>
          </div>

          {/* Provider and LLM Info */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Badge size="small" variant="primary" style="outline">
              Provider: {bot.messageProvider}
            </Badge>
            <Badge size="small" variant="secondary" style="outline">
              LLM: {bot.llmProvider}
            </Badge>
            {bot.persona && (
              <Badge size="small" style="outline">
                Persona: {bot.persona}
              </Badge>
            )}
          </div>

          {/* Health Score */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-base-content/60">Health Score</span>
              <span className="text-sm font-medium">{healthScore}%</span>
            </div>
            <LinearProgress
              value={healthScore}
              color={getHealthColor(healthScore)}
              className="h-2 rounded"
            />
          </div>

          {/* Quick Stats */}
          <div className="flex justify-between mb-4">
            <div className="text-center">
              <h4 className="text-xl text-primary">{statusData?.messageCount || 0}</h4>
              <span className="text-xs text-base-content/60 block">Messages</span>
            </div>
            <div className="text-center">
              <h4 className="text-xl text-error">{statusData?.errorCount || 0}</h4>
              <span className="text-xs text-base-content/60 block">Errors</span>
            </div>
            <div className="text-center">
              <h4 className="text-xl text-success">{statusData?.connected ? '✓' : '✗'}</h4>
              <span className="text-xs text-base-content/60 block">Connected</span>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mb-4 space-y-1 text-sm text-base-content/60">
            <p>Response Time: {formatResponseTime(statusData?.responseTime || 0)}</p>
            <p>Uptime: {formatUptime(statusData?.uptime || 0)}</p>
            {statusData?.lastActivity && (
              <p>Last Activity: {new Date(statusData.lastActivity).toLocaleString()}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDetailsOpen(true)}
            >
              <span className="mr-1">⚙️</span>Details
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  if (onRefresh) onRefresh();
                }, 1000);
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Detailed Information Modal */}
      <Modal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={`Bot Details - ${bot.name}`}
        size="md"
        actions={[
          {
            label: 'Close',
            onClick: () => setDetailsOpen(false),
            variant: 'ghost'
          }
        ]}
      >
        <Accordion
          items={[
            {
              id: 'basic',
              title: 'Basic Information',
              content: (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">Name:</span>
                    <span>{bot.name}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">Message Provider:</span>
                    <span>{bot.messageProvider}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">LLM Provider:</span>
                    <span>{bot.llmProvider}</span>
                  </div>
                  {bot.persona && (
                    <div className="flex gap-2 items-center">
                      <span className="min-w-[120px] font-bold">Persona:</span>
                      <span>{bot.persona}</span>
                    </div>
                  )}
                </div>
              )
            },
            {
              id: 'status',
              title: 'Status Information',
              content: (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">Status:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getStatusIcon(statusData?.status || 'unknown')}</span>
                      <span>{statusData?.status || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">Connected:</span>
                    <span>{statusData?.connected ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">Health Score:</span>
                    <span>{healthScore}%</span>
                  </div>
                </div>
              )
            },
            {
              id: 'performance',
              title: 'Performance Metrics',
              content: (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">Messages:</span>
                    <span>{statusData?.messageCount || 0}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">Errors:</span>
                    <span className="text-error">{statusData?.errorCount || 0}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">Response Time:</span>
                    <span>{formatResponseTime(statusData?.responseTime || 0)}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="min-w-[120px] font-bold">Uptime:</span>
                    <span>{formatUptime(statusData?.uptime || 0)}</span>
                  </div>
                </div>
              )
            },
            ...(statusData?.healthDetails ? [{
              id: 'health-details',
              title: 'Health Details',
              content: (
                <div className="flex flex-col gap-4">
                  {Object.entries(statusData.healthDetails).map(([key, value]) => (
                    <div key={key} className="flex gap-2 items-start">
                      <span className="min-w-[120px] font-bold">{key}:</span>
                      <span className="whitespace-pre-wrap">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }] : []),
            {
              id: 'configuration',
              title: 'Configuration',
              content: (
                <div className="flex flex-col gap-4">
                  {bot.systemInstruction && (
                    <div>
                      <span className="font-bold mb-2 block">System Instruction:</span>
                      <div className="italic bg-base-200 p-2 rounded">
                        {bot.systemInstruction}
                      </div>
                    </div>
                  )}
                  {bot.mcpServers && (
                    <div>
                      <span className="font-bold mb-2 block">MCP Servers:</span>
                      <span>
                        {Array.isArray(bot.mcpServers) ? bot.mcpServers.length : 1} server(s) configured
                      </span>
                    </div>
                  )}
                </div>
              )
            }
          ]}
          allowMultiple={true}
          defaultOpenItems={['status']}
        />
      </Modal>
    </>
  );
};

export default BotStatusCard;