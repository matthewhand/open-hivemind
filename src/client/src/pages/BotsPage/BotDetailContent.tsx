import React from 'react';
import {
  Bot, Activity, MessageSquare, AlertCircle, RefreshCw, Globe, Cpu, Download, Play, Pause, Settings, ShieldCheck
} from 'lucide-react';
import type { BotConfig } from '../../types/bot';
import Button from '../../components/DaisyUI/Button';
import Select from '../../components/DaisyUI/Select';
import Tabs from '../../components/DaisyUI/Tabs';
import ConfigurationValidation from '../../components/ConfigurationValidation';
import { Stat, Stats } from '../../components/DaisyUI/Stat';
import Tooltip from '../../components/DaisyUI/Tooltip';
import Figure from '../../components/DaisyUI/Figure';
import Input from '../../components/DaisyUI/Input';
import Join from '../../components/DaisyUI/Join';
import BotResponseTimeline from '../../components/BotResponseTimeline';

interface BotDetailContentProps {
  previewBot: BotConfig | null;
  previewTab: 'activity' | 'chat' | 'validation';
  setPreviewTab: (tab: 'activity' | 'chat' | 'validation') => void;
  activityLogs: any[];
  chatHistory: any[];
  logFilter: string;
  setLogFilter: (filter: string) => void;
  activityError: string | null;
  chatError: string | null;
  fetchPreviewActivity: (botId: string, limit?: number) => Promise<void>;
  fetchPreviewChat: (botId: string) => Promise<void>;
  setEditingBot: (bot: BotConfig | null) => void;
  handleExportSingleBot: (bot: BotConfig) => void;
  handleToggleBotStatus: (bot: BotConfig) => void;
  onClose: () => void;
}

export const BotDetailContent: React.FC<BotDetailContentProps> = ({
  previewBot,
  previewTab,
  setPreviewTab,
  activityLogs,
  chatHistory,
  logFilter,
  setLogFilter,
  activityError,
  chatError,
  fetchPreviewActivity,
  fetchPreviewChat,
  setEditingBot,
  handleExportSingleBot,
  handleToggleBotStatus,
  onClose,
}) => {
  const filteredLogs = React.useMemo(() => {
    if (!logFilter) return activityLogs;
    return activityLogs.filter((log) =>
      log.message?.toLowerCase().includes(logFilter.toLowerCase()) ||
      log.type?.toLowerCase().includes(logFilter.toLowerCase())
    );
  }, [activityLogs, logFilter]);

  if (!previewBot) {
    return (
      <div className="flex flex-col items-center justify-center text-center opacity-40 py-12">
        <Bot className="w-12 h-12 mb-2" />
        <h3 className="font-bold">Agent Preview</h3>
        <p className="text-xs max-w-[200px]">
          Select an agent from the list to view its activity and configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with status and provider info */}
      <div className="flex items-center gap-3">
        <Figure
          caption={
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">
              {previewBot.status}
            </span>
          }
          className="flex flex-col items-center"
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-6 h-6 text-primary" />
          </div>
        </Figure>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate">{previewBot.name}</h3>
          <div className="flex items-center gap-2">
            <span
              className={`badge badge-xs ${
                previewBot.status === 'active' ? 'badge-success' : 'badge-ghost'
              }`}
            ></span>
            <span className="text-xs uppercase tracking-wider font-semibold opacity-60">
              {previewBot.status}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Description</label>
        <p className="text-sm italic">{previewBot?.description || 'No description provided.'}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-base-200/50 p-2 rounded-lg">
          <label className="text-xs font-bold uppercase opacity-50 block mb-1">Provider</label>
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium uppercase">{previewBot.llmProvider || 'Not configured'}</span>
          </div>
        </div>
        <div className="bg-base-200/50 p-2 rounded-lg">
          <label className="text-xs font-bold uppercase opacity-50 block mb-1">Model</label>
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3 text-secondary" />
            <span className="text-xs font-medium">{previewBot.llmModel || 'Not configured'}</span>
          </div>
        </div>
      </div>

      <Stats className="bg-base-200 w-full shadow-sm">
        <Stat
          className="p-3"
          title={<span className="text-xs uppercase font-bold">Messages</span>}
          value={previewBot.messageCount ?? 0}
          valueClassName="text-xl text-primary"
        />
        <Stat
          className="p-3"
          title={<span className="text-xs uppercase font-bold">Errors</span>}
          value={previewBot.errorCount ?? 0}
          valueClassName={`text-xl ${(previewBot.errorCount ?? 0) > 0 ? 'text-error' : ''}`}
        />
      </Stats>

      {/* Tabs Navigation */}
      <Tabs
        tabs={[
          { key: 'activity', label: <span className="text-xs uppercase font-bold">Activity</span>, icon: <Activity className="w-3 h-3" />, color: 'info' as const },
          { key: 'chat', label: <span className="text-xs uppercase font-bold">Chat</span>, icon: <MessageSquare className="w-3 h-3" />, color: 'primary' as const },
          { key: 'validation', label: <span className="text-xs uppercase font-bold">Validation</span>, icon: <ShieldCheck className="w-3 h-3" />, color: 'success' as const },
        ]}
        activeTab={previewTab}
        onChange={(key) => setPreviewTab(key as 'activity' | 'chat' | 'validation')}
        variant="boxed"
        size="sm"
        className="flex-nowrap"
      />

      {/* Activity Log Panel */}
      {previewTab === 'activity' && (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          <div className="flex items-center justify-end mb-2">
            <Join className="w-full">
              <Input
                size="xs"
                placeholder="Filter..."
                className="join-item flex-1"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
              />
              <Select
                size="xs"
                onChange={async (e) => {
                  const limit = parseInt(e.target.value, 10);
                  if (previewBot) {
                    await fetchPreviewActivity(previewBot.id, limit);
                  }
                }}
                options={[
                  { label: '20', value: '20' },
                  { label: '50', value: '50' },
                  { label: '100', value: '100' },
                ]}
                className="join-item"
              />
            </Join>
          </div>

          {activityError ? (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-error" />
              <p className="text-xs text-error mb-2">{activityError}</p>
              <Button
                variant="outline"
                size="xs"
                onClick={() => previewBot && fetchPreviewActivity(previewBot.id)}
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 opacity-40">
              <Activity className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">No activity recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="bg-base-200/30 p-2 rounded text-xs border-l-2 border-primary"
                >
                  <div className="flex justify-between opacity-60 mb-1">
                    <span className="font-bold uppercase">{log.type}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="line-clamp-2">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Validation Panel */}
      {previewTab === 'validation' && (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          <ConfigurationValidation bot={previewBot} />
        </div>
      )}

      {/* Chat History Panel — Response Timeline */}
      {previewTab === 'chat' && (
        <BotResponseTimeline
          chatHistory={chatHistory}
          chatError={chatError}
          onRetry={() => previewBot && fetchPreviewChat(previewBot.id)}
          onRefresh={() => previewBot && fetchPreviewChat(previewBot.id)}
        />
      )}
    </div>
  );
};
