/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { Card, Badge, Button, Modal, Accordion, Progress } from './DaisyUI';
import {
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Bot,
  MessageSquare,
  MessageCircle,
  Wrench,
  Smartphone
} from 'lucide-react';
import type { Bot as BotType } from '../services/api';

interface BotStatusCardProps {
  bot: BotType;
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
  onRefresh,
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const getStatusIcon = (status: string) => {
    const className = 'w-5 h-5';
    switch (status?.toLowerCase()) {
    case 'active':
    case 'connected':
      return <CheckCircle className={`${className} text-success`} />;
    case 'error':
    case 'disconnected':
      return <XCircle className={`${className} text-error`} />;
    case 'warning':
    case 'connecting':
      return <AlertTriangle className={`${className} text-warning`} />;
    default:
      return <Info className={`${className} text-base-content/50`} />;
    }
  };

  const getStatusVariant = (status: string): 'success' | 'error' | 'warning' | 'ghost' => {
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
      return 'ghost';
    }
  };

  const getProviderIcon = (provider: string) => {
    const className = "w-6 h-6";
    switch (provider?.toLowerCase()) {
    case 'discord':
      return <Bot className={className} />;
    case 'slack':
      return <MessageSquare className={className} />;
    case 'mattermost':
      return <MessageCircle className={className} />;
    default:
      return <Wrench className={className} />;
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) { return 'N/A'; }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatResponseTime = (ms: number) => {
    if (!ms) { return 'N/A'; }
    if (ms < 1000) { return `${ms}ms`; }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getHealthScore = () => {
    if (!statusData) { return 0; }

    let score = 100;
    if (statusData.status !== 'active' && statusData.status !== 'connected') { score -= 30; }
    if (statusData.errorCount && statusData.errorCount > 0) { score -= 20; }
    if (statusData.responseTime && statusData.responseTime > 2000) { score -= 15; }
    if (!statusData.connected) { score -= 25; }

    return Math.max(0, score);
  };

  const getHealthVariant = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) { return 'success'; }
    if (score >= 60) { return 'warning'; }
    return 'error';
  };

  const healthScore = getHealthScore();

  return (
    <>
      <Card className="min-w-[350px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-base-100 border border-base-200">
        <Card.Body>
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-base-200 rounded-lg">
                  {getProviderIcon(bot.messageProvider)}
              </div>
              <h3 className="text-lg font-bold">{bot.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(statusData?.status || 'unknown')} size="sm">
                {statusData?.status || 'unknown'}
              </Badge>
            </div>
          </div>

          {/* Provider and LLM Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="ghost" size="sm" className="bg-base-200">
              Provider: {bot.messageProvider}
            </Badge>
            <Badge variant="primary" size="sm" className="bg-primary/10 text-primary">
              LLM: {bot.llmProvider}
            </Badge>
            {bot.persona && (
              <Badge variant="secondary" size="sm" className="bg-secondary/10 text-secondary">
                Persona: {bot.persona}
              </Badge>
            )}
          </div>

          {/* Health Score */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-base-content/70">
                Health Score
              </span>
              <span className="text-sm font-medium">
                {healthScore}%
              </span>
            </div>
            <Progress value={healthScore} variant={getHealthVariant(healthScore)} size="md" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4 text-center bg-base-200/50 rounded-xl p-3">
            <div>
              <div className="text-xl font-bold text-primary">
                {statusData?.messageCount || 0}
              </div>
              <div className="text-xs text-base-content/70 font-medium uppercase tracking-wider">
                Messages
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-error">
                {statusData?.errorCount || 0}
              </div>
              <div className="text-xs text-base-content/70 font-medium uppercase tracking-wider">
                Errors
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-success flex justify-center">
                {statusData?.connected ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6 text-error" />}
              </div>
              <div className="text-xs text-base-content/70 font-medium uppercase tracking-wider">
                Connected
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mb-4 space-y-1 px-1">
            <p className="text-sm text-base-content/70 flex justify-between">
              <span>Response Time:</span>
              <span className="font-mono">{formatResponseTime(statusData?.responseTime || 0)}</span>
            </p>
            <p className="text-sm text-base-content/70 flex justify-between">
              <span>Uptime:</span>
              <span className="font-mono">{formatUptime(statusData?.uptime || 0)}</span>
            </p>
            {statusData?.lastActivity && (
              <p className="text-sm text-base-content/70 flex justify-between">
                <span>Last Activity:</span>
                <span className="text-xs">{new Date(statusData.lastActivity).toLocaleTimeString()}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-auto">
            <Button
              size="sm"
              variant="secondary"
              className="btn-outline flex-1 flex items-center gap-2"
              onClick={() => setDetailsOpen(true)}
            >
              <Settings className="w-4 h-4" />
              Details
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex items-center gap-2"
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  if (onRefresh) { onRefresh(); }
                }, 1000);
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Detailed Information Modal */}
      <Modal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={`Bot Details - ${bot.name}`}
        size="lg"
        actions={[
            {
                label: 'Close',
                onClick: () => setDetailsOpen(false),
                variant: 'primary'
            }
        ]}
      >
          <div className="space-y-2">
            {/* Basic Information */}
            <Accordion
              items={[
                {
                  id: 'basic',
                  title: 'Basic Information',
                  content: (
                    <div className="space-y-3">
                      <div className="flex gap-4 border-b border-base-200 pb-2">
                        <span className="text-sm font-semibold min-w-[140px]">Name:</span>
                        <span className="text-sm">{bot.name}</span>
                      </div>
                      <div className="flex gap-4 border-b border-base-200 pb-2">
                        <span className="text-sm font-semibold min-w-[140px]">Message Provider:</span>
                        <span className="text-sm">{bot.messageProvider}</span>
                      </div>
                      <div className="flex gap-4 border-b border-base-200 pb-2">
                        <span className="text-sm font-semibold min-w-[140px]">LLM Provider:</span>
                        <span className="text-sm">{bot.llmProvider}</span>
                      </div>
                      {bot.persona && (
                        <div className="flex gap-4">
                          <span className="text-sm font-semibold min-w-[140px]">Persona:</span>
                          <span className="text-sm">{bot.persona}</span>
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  id: 'status',
                  title: 'Status Information',
                  content: (
                    <div className="space-y-3">
                      <div className="flex gap-4 border-b border-base-200 pb-2">
                        <span className="text-sm font-semibold min-w-[140px]">Status:</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(statusData?.status || 'unknown')}
                          <span className="text-sm capitalize">{statusData?.status || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="flex gap-4 border-b border-base-200 pb-2">
                        <span className="text-sm font-semibold min-w-[140px]">Connected:</span>
                        <span className={`text-sm font-medium ${statusData?.connected ? 'text-success' : 'text-error'}`}>
                          {statusData?.connected ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-sm font-semibold min-w-[140px]">Health Score:</span>
                        <span className={`text-sm font-medium text-${getHealthVariant(healthScore)}`}>{healthScore}%</span>
                      </div>
                    </div>
                  )
                },
                {
                  id: 'performance',
                  title: 'Performance Metrics',
                  content: (
                    <div className="space-y-3">
                      <div className="flex gap-4 border-b border-base-200 pb-2">
                        <span className="text-sm font-semibold min-w-[140px]">Messages:</span>
                        <span className="text-sm">{statusData?.messageCount || 0}</span>
                      </div>
                      <div className="flex gap-4 border-b border-base-200 pb-2">
                        <span className="text-sm font-semibold min-w-[140px]">Errors:</span>
                        <span className="text-sm text-error font-medium">
                          {statusData?.errorCount || 0}
                        </span>
                      </div>
                      <div className="flex gap-4 border-b border-base-200 pb-2">
                        <span className="text-sm font-semibold min-w-[140px]">Response Time:</span>
                        <span className="text-sm font-mono">
                          {formatResponseTime(statusData?.responseTime || 0)}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-sm font-semibold min-w-[140px]">Uptime:</span>
                        <span className="text-sm font-mono">
                          {formatUptime(statusData?.uptime || 0)}
                        </span>
                      </div>
                    </div>
                  )
                },
                ...(statusData?.healthDetails ? [{
                  id: 'health',
                  title: 'Health Details',
                  content: (
                    <div className="space-y-3">
                      {Object.entries(statusData.healthDetails).map(([key, value]) => (
                        <div key={key} className="flex gap-4 border-b border-base-200 pb-2 last:border-0">
                          <span className="text-sm font-semibold min-w-[140px] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="text-sm font-mono break-all">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }] : []),
                {
                  id: 'config',
                  title: 'Configuration',
                  content: (
                    <div className="space-y-3">
                      {bot.systemInstruction && (
                        <div>
                          <p className="text-sm font-semibold mb-2">System Instruction:</p>
                          <p className="text-sm italic bg-base-200 p-3 rounded-lg border border-base-300">
                            {bot.systemInstruction.length > 100 ? bot.systemInstruction.substring(0, 100) + '...' : bot.systemInstruction}
                          </p>
                        </div>
                      )}
                      {bot.mcpServers && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold mb-2">MCP Servers:</p>
                          <p className="text-sm">
                            {Array.isArray(bot.mcpServers) ? bot.mcpServers.length : 1} server(s) configured
                          </p>
                        </div>
                      )}
                    </div>
                  )
                }
              ]}
              defaultOpenItems={['basic', 'status']}
              allowMultiple={true}
            />
          </div>
      </Modal>
    </>
  );
};

export default BotStatusCard;
