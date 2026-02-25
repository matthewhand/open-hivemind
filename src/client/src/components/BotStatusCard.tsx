/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { Card, Badge, Button, Loading, Modal, Accordion, Progress } from './DaisyUI';
import {
  RefreshCw,
  Settings,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Bot,
  MessageCircle,
  Smartphone,
  Server,
  Activity
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
      return <AlertCircle className={`${className} text-error`} />;
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
      return <MessageCircle className={className} />;
    case 'mattermost':
      return <Smartphone className={className} />;
    default:
      return <Server className={className} />;
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) {return 'N/A';}
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatResponseTime = (ms: number) => {
    if (!ms) {return 'N/A';}
    if (ms < 1000) {return `${ms}ms`;}
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getHealthScore = () => {
    if (!statusData) {return 0;}

    let score = 100;
    if (statusData.status !== 'active') {score -= 30;}
    if (statusData.errorCount && statusData.errorCount > 0) {score -= 20;}
    if (statusData.responseTime && statusData.responseTime > 2000) {score -= 15;}
    if (!statusData.connected) {score -= 25;}

    return Math.max(0, score);
  };

  const getHealthVariant = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) {return 'success';}
    if (score >= 60) {return 'warning';}
    return 'error';
  };

  const healthScore = getHealthScore();

  const accordionItems = [
    {
      id: 'basic',
      title: 'Basic Information',
      content: (
        <div className="space-y-3">
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">Name:</span>
            <span className="text-sm">{bot.name}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">Message Provider:</span>
            <span className="text-sm">{bot.messageProvider}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">LLM Provider:</span>
            <span className="text-sm">{bot.llmProvider}</span>
          </div>
          {bot.persona && (
            <div className="flex gap-4">
              <span className="text-sm font-semibold min-w-[120px]">Persona:</span>
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
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">Status:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(statusData?.status || 'unknown')}
              <span className="text-sm">{statusData?.status || 'Unknown'}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">Connected:</span>
            <span className="text-sm">
              {statusData?.connected ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">Health Score:</span>
            <span className="text-sm">{healthScore}%</span>
          </div>
        </div>
      )
    },
    {
      id: 'performance',
      title: 'Performance Metrics',
      content: (
        <div className="space-y-3">
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">Messages:</span>
            <span className="text-sm">{statusData?.messageCount || 0}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">Errors:</span>
            <span className="text-sm text-error">
              {statusData?.errorCount || 0}
            </span>
          </div>
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">Response Time:</span>
            <span className="text-sm">
              {formatResponseTime(statusData?.responseTime || 0)}
            </span>
          </div>
          <div className="flex gap-4">
            <span className="text-sm font-semibold min-w-[120px]">Uptime:</span>
            <span className="text-sm">
              {formatUptime(statusData?.uptime || 0)}
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'config',
      title: 'Configuration',
      content: (
        <div className="space-y-3">
          {bot.systemInstruction && (
            <div>
              <p className="text-sm font-semibold mb-2">System Instruction:</p>
              <p className="text-sm italic bg-base-200 p-3 rounded-lg">
                {bot.systemInstruction}
              </p>
            </div>
          )}
          {bot.mcpServers && (
            <div>
              <p className="text-sm font-semibold mb-2">MCP Servers:</p>
              <p className="text-sm">
                {Array.isArray(bot.mcpServers) ? bot.mcpServers.length : 1} server(s) configured
              </p>
            </div>
          )}
        </div>
      )
    }
  ];

  if (statusData?.healthDetails) {
    accordionItems.push({
        id: 'health',
        title: 'Health Details',
        content: (
          <div className="space-y-3">
            {Object.entries(statusData.healthDetails).map(([key, value]) => (
              <div key={key} className="flex gap-4">
                <span className="text-sm font-semibold min-w-[120px]">{key}:</span>
                <span className="text-sm">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )
    });
  }

  return (
    <>
      <Card className="min-w-[350px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <Card.Body>
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-primary">{getProviderIcon(bot.messageProvider)}</span>
              <h3 className="text-lg font-bold">{bot.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(statusData?.status || 'unknown')}
              <Badge variant={getStatusVariant(statusData?.status || 'unknown')} size="sm">
                {statusData?.status || 'unknown'}
              </Badge>
            </div>
          </div>

          {/* Provider and LLM Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="primary" size="sm">
              Provider: {bot.messageProvider}
            </Badge>
            <Badge variant="secondary" size="sm">
              LLM: {bot.llmProvider}
            </Badge>
            {bot.persona && (
              <Badge variant="accent" size="sm">
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
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div>
              <div className="text-xl font-bold text-primary">
                {statusData?.messageCount || 0}
              </div>
              <div className="text-xs text-base-content/70">
                Messages
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-error">
                {statusData?.errorCount || 0}
              </div>
              <div className="text-xs text-base-content/70">
                Errors
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-success">
                {statusData?.connected ? '✓' : '✗'}
              </div>
              <div className="text-xs text-base-content/70">
                Connected
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mb-4 space-y-1">
            <p className="text-sm text-base-content/70">
              Response Time: {formatResponseTime(statusData?.responseTime || 0)}
            </p>
            <p className="text-sm text-base-content/70">
              Uptime: {formatUptime(statusData?.uptime || 0)}
            </p>
            {statusData?.lastActivity && (
              <p className="text-sm text-base-content/70">
                Last Activity: {new Date(statusData.lastActivity).toLocaleString()}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="btn-outline flex items-center gap-2"
              onClick={() => setDetailsOpen(true)}
            >
              <Settings className="w-4 h-4" />
              Details
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="btn-outline flex items-center gap-2"
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  if (onRefresh) {onRefresh();}
                }, 1000);
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Detailed Information Modal */}
      <Modal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={`Bot Details - ${bot.name}`}
        actions={[
          {
            label: 'Close',
            onClick: () => setDetailsOpen(false),
          }
        ]}
      >
          <div className="space-y-2">
            {/* Basic Information */}
            <Accordion items={accordionItems} />
          </div>
      </Modal>
    </>
  );
};

export default BotStatusCard;