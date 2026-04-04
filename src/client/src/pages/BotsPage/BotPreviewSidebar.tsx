import React from 'react';
import {
  Bot, Activity, MessageSquare, AlertCircle, RefreshCw, X, Globe, Cpu, Download, Play, Pause, Settings, ShieldCheck
} from 'lucide-react';
import type { BotConfig } from '../../types/bot';
import Button from '../../components/DaisyUI/Button';
import Tabs from '../../components/DaisyUI/Tabs';
import ConfigurationValidation from '../../components/ConfigurationValidation';
import Tooltip from '../../components/DaisyUI/Tooltip';

interface BotPreviewSidebarProps {
  previewBot: BotConfig | null;
  setPreviewBot: (bot: BotConfig | null) => void;
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
}

export const BotPreviewSidebar: React.FC<BotPreviewSidebarProps> = ({
  previewBot,
  setPreviewBot,
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
      <div className="card bg-base-100 shadow-xl border border-dashed border-base-300 h-full min-h-[400px]">
        <div className="card-body items-center justify-center text-center opacity-40">
          <Bot className="w-12 h-12 mb-2" />
          <h3 className="font-bold">Agent Preview</h3>
          <p className="text-xs max-w-[200px]">
            Select an agent from the swarm to view its activity and configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200 sticky top-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="card-body p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{previewBot.name}</h3>
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
          <Tooltip content="Close preview">
            <Button variant="ghost" size="sm" onClick={() => setPreviewBot(null)} className="btn-square" aria-label="Close preview">
              <X className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Description</label>
            <p className="text-sm italic">{previewBot?.description || 'No description provided.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-base-200/50 p-2 rounded-lg">
              <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Provider</label>
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium uppercase">{previewBot.llmProvider || 'Not configured'}</span>
              </div>
            </div>
            <div className="bg-base-200/50 p-2 rounded-lg">
              <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Model</label>
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 text-secondary" />
                <span className="text-xs font-medium">{previewBot.llmModel || 'Not configured'}</span>
              </div>
            </div>
          </div>

          <div className="stats bg-base-200 w-full shadow-sm">
            <div className="stat p-3">
              <div className="stat-title text-[10px] uppercase font-bold">Messages</div>
              <div className="stat-value text-xl text-primary">{previewBot.messageCount ?? 0}</div>
            </div>
            <div className="stat p-3">
              <div className="stat-title text-[10px] uppercase font-bold">Errors</div>
              <div
                className={`stat-value text-xl ${
                  (previewBot.errorCount ?? 0) > 0 ? 'text-error' : ''
                }`}
              >
                {previewBot.errorCount ?? 0}
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <Tabs
            tabs={[
              { key: 'activity', label: <span className="text-[10px] uppercase font-bold">Activity</span>, icon: <Activity className="w-3 h-3" /> },
              { key: 'chat', label: <span className="text-[10px] uppercase font-bold">Chat</span>, icon: <MessageSquare className="w-3 h-3" /> },
              { key: 'validation', label: <span className="text-[10px] uppercase font-bold">Validation</span>, icon: <ShieldCheck className="w-3 h-3" /> },
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
                <div className="join w-full">
                  <input
                    type="text"
                    placeholder="Filter..."
                    className="input input-xs input-bordered join-item flex-1"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                  />
                  <select
                    className="select select-xs select-bordered join-item"
                    onChange={async (e) => {
                      const limit = parseInt(e.target.value, 10);
                      if (previewBot) {
                        await fetchPreviewActivity(previewBot.id, limit);
                      }
                    }}
                  >
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>

              {activityError ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-error" />
                  <p className="text-xs text-error mb-2">{activityError}</p>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => previewBot && fetchPreviewActivity(previewBot.id)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                  </button>
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
                      className="bg-base-200/30 p-2 rounded text-[11px] border-l-2 border-primary"
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

          {/* Chat History Panel */}
          {previewTab === 'chat' && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {chatError ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-error" />
                  <p className="text-xs text-error mb-2">{chatError}</p>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => previewBot && fetchPreviewChat(previewBot.id)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                  </button>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center py-8 opacity-40">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs">No recent chat history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
                    >
                      <div
                        className={`chat-bubble text-[11px] min-h-0 py-1.5 px-3 ${
                          msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="chat-footer opacity-50 text-[9px] mt-0.5">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card-actions mt-2 pt-4 border-t border-base-200">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => setEditingBot(previewBot)}
            >
              <Settings className="w-3 h-3 mr-2" /> Configuration
            </Button>
            <Tooltip content="Export bot config">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportSingleBot(previewBot)}
                className="btn-square"
                aria-label="Export bot config"
              >
                <Download className="w-3 h-3" />
              </Button>
            </Tooltip>
            <Tooltip content={previewBot.status === 'active' ? 'Deactivate' : 'Activate'}>
              <Button
                variant={previewBot.status === 'active' ? 'ghost' : 'primary'}
                size="sm"
                onClick={() => handleToggleBotStatus(previewBot)}
                className={`btn-square ${previewBot.status === 'active' ? 'text-error border-error' : ''}`}
                aria-label={previewBot.status === 'active' ? 'Deactivate' : 'Activate'}
              >
                {previewBot.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
