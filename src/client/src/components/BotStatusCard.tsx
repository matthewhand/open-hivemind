import React, { useState } from 'react';
import { Card, Badge, Button, Modal, Accordion, Progress } from './DaisyUI';
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
  Zap,
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
    switch (provider?.toLowerCase()) {
    case 'discord':
      return <Bot className="w-6 h-6" />;
    case 'slack':
      return <MessageCircle className="w-6 h-6" />;
    case 'mattermost':
      return <Smartphone className="w-6 h-6" />;
    default:
      return <Server className="w-6 h-6" />;
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
            <Badge variant="neutral" size="sm" className="gap-1">
              <Server className="w-3 h-3"/> {bot.messageProvider}
            </Badge>
            <Badge variant="secondary" size="sm" className="gap-1">
              <Zap className="w-3 h-3"/> {bot.llmProvider}
            </Badge>
            {bot.persona && (
              <Badge variant="accent" size="sm">
                {bot.persona}
              </Badge>
            )}
          </div>

          {/* Health Score */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-base-content/70 flex items-center gap-1">
                <Activity className="w-3 h-3"/> Health Score
              </span>
              <span className="text-sm font-medium">
                {healthScore}%
              </span>
            </div>
            <Progress value={healthScore} variant={getHealthVariant(healthScore)} size="md" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div className="bg-base-200/50 rounded-lg p-2">
              <div className="text-xl font-bold text-primary">
                {statusData?.messageCount || 0}
              </div>
              <div className="text-xs text-base-content/70">
                Messages
              </div>
            </div>
            <div className="bg-base-200/50 rounded-lg p-2">
              <div className="text-xl font-bold text-error">
                {statusData?.errorCount || 0}
              </div>
              <div className="text-xs text-base-content/70">
                Errors
              </div>
            </div>
            <div className="bg-base-200/50 rounded-lg p-2">
              <div className={`text-xl font-bold ${statusData?.connected ? 'text-success' : 'text-error'}`}>
                {statusData?.connected ? <CheckCircle className="w-6 h-6 mx-auto"/> : <AlertCircle className="w-6 h-6 mx-auto"/>}
              </div>
              <div className="text-xs text-base-content/70 mt-1">
                Connected
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mb-4 space-y-1 bg-base-200/30 p-3 rounded-lg text-sm">
            <div className="flex justify-between">
               <span className="text-base-content/70">Response Time:</span>
               <span className="font-mono">{formatResponseTime(statusData?.responseTime || 0)}</span>
            </div>
            <div className="flex justify-between">
               <span className="text-base-content/70">Uptime:</span>
               <span className="font-mono">{formatUptime(statusData?.uptime || 0)}</span>
            </div>
            {statusData?.lastActivity && (
               <div className="flex justify-between">
                  <span className="text-base-content/70">Last Activity:</span>
                  <span className="text-xs self-center">{new Date(statusData.lastActivity).toLocaleTimeString()}</span>
               </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-auto">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 flex items-center gap-2"
              onClick={() => setDetailsOpen(true)}
            >
              <Settings className="w-4 h-4" />
              Details
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 flex items-center gap-2"
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
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <Modal.Header>
          Bot Details - {bot.name}
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-2">
            {/* Basic Information */}
            <Accordion defaultOpen>
              <Accordion.Item value="basic">
                <Accordion.Trigger>
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4"/> <span>Basic Information</span>
                  </div>
                </Accordion.Trigger>
                <Accordion.Content>
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
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>

            {/* Status Information */}
            <Accordion defaultOpen>
              <Accordion.Item value="status">
                <Accordion.Trigger>
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4"/> <span>Status Information</span>
                    </div>
                </Accordion.Trigger>
                <Accordion.Content>
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
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>

            {/* Performance Metrics */}
            <Accordion>
              <Accordion.Item value="performance">
                <Accordion.Trigger>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4"/> <span>Performance Metrics</span>
                    </div>
                </Accordion.Trigger>
                <Accordion.Content>
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
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>

            {/* Health Details */}
            {statusData?.healthDetails && (
              <Accordion>
                <Accordion.Item value="health">
                  <Accordion.Trigger>Health Details</Accordion.Trigger>
                  <Accordion.Content>
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
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion>
            )}

            {/* Configuration */}
            <Accordion>
              <Accordion.Item value="config">
                <Accordion.Trigger>
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4"/> <span>Configuration</span>
                    </div>
                </Accordion.Trigger>
                <Accordion.Content>
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
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </div>
        </Modal.Body>
        <Modal.Actions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
};

export default BotStatusCard;
