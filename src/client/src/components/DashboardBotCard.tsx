import React, { memo, useState } from 'react';
import PersonaAvatar from './PersonaAvatar';
import Badge from './DaisyUI/Badge';
import Card from './DaisyUI/Card';
import Tooltip from './DaisyUI/Tooltip';
import Button from './DaisyUI/Button';
import type { Bot, StatusResponse } from '../services/api';
import { Activity, Sparkles, History, Trophy } from 'lucide-react';
import DiagnosticModal from './BotManagement/DiagnosticModal';
import InsightsModal from './BotManagement/InsightsModal';
import VersionHistoryModal from './BotManagement/VersionHistoryModal';
import BenchmarkModal from './BotManagement/BenchmarkModal';
import { botStatusVariant } from '../utils/botStatus';

interface DashboardBotCardProps {
  bot: Bot;
  botStatusData: StatusResponse['bots'][0] | undefined;
  rating: number;
  onRatingChange: (botName: string, rating: number) => void;
  getProviderIcon: (provider: string) => string;
  getStatusColor: (status: string) => string;
}

const DashboardBotCard: React.FC<DashboardBotCardProps> = memo(({
  bot,
  botStatusData,
  getStatusColor,
}) => {
  const botStatus = botStatusData?.status || 'unknown';
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);

  return (
    <>
      <Card className="shadow-md hover:shadow-lg transition-all duration-200 group">
        <div className="card-body p-4">
          {/* Header: avatar + name + status */}
          <div className="flex items-center gap-3">
            <PersonaAvatar
              seed={bot.persona || bot.name}
              size={40}
            />
            <div className="flex-1 min-w-0">
              <h2 className="card-title text-base font-semibold truncate">
                {bot.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
               <Tooltip content="Run Performance Benchmark" position="top">
                 <Button
                   variant="ghost"
                   size="xs"
                   className="btn-square opacity-0 group-hover:opacity-40 hover:opacity-100 focus-visible:opacity-100 transition-opacity text-warning focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                   onClick={() => setIsBenchmarkOpen(true)}
                   aria-label={`Run performance benchmark for ${bot.name}`}
                 >
                    <Trophy className="w-4 h-4" />
                 </Button>
               </Tooltip>
               <Tooltip content="Version History" position="top">
                 <Button
                   variant="ghost"
                   size="xs"
                   className="btn-square opacity-0 group-hover:opacity-40 hover:opacity-100 focus-visible:opacity-100 transition-opacity text-secondary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                   onClick={() => setIsHistoryOpen(true)}
                   aria-label={`View version history for ${bot.name}`}
                 >
                    <History className="w-4 h-4" />
                 </Button>
               </Tooltip>
               <Tooltip content="AI Performance Insights" position="top">
                 <Button
                   variant="ghost"
                   size="xs"
                   className="btn-square opacity-0 group-hover:opacity-40 hover:opacity-100 focus-visible:opacity-100 transition-opacity text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                   onClick={() => setIsInsightsOpen(true)}
                   aria-label={`View AI performance insights for ${bot.name}`}
                 >
                    <Sparkles className="w-4 h-4" />
                 </Button>
               </Tooltip>
               <Tooltip content="Run Diagnostic" position="top">
                 <Button
                   variant="ghost"
                   size="xs"
                   className="btn-square opacity-0 group-hover:opacity-40 hover:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                   onClick={() => setIsDiagnosticOpen(true)}
                   aria-label={`Run diagnostic for ${bot.name}`}
                 >
                    <Activity className="w-4 h-4" />
                 </Button>
               </Tooltip>
               <Badge
                variant={botStatusVariant(botStatus)}
                size="small"
              >
                {botStatus.toUpperCase()}
              </Badge>
            </div>
          </div>

        {/* Provider badges */}
        <ul className="flex flex-wrap gap-1.5 mt-3" aria-label="Bot Providers">
          <li><Badge variant="neutral" size="small">
            📱 {bot.messageProvider}
          </Badge></li>
          {bot.llmProvider && (
            <li><Badge variant="secondary" size="small">
              🤖 {bot.llmProvider}
            </Badge></li>
          )}
        </ul>

        {/* Error alert (only when errors exist) */}
        {(botStatusData?.errorCount ?? 0) > 0 && (
          <div className="alert alert-error py-2 mt-3">
            <span className="text-xs">{botStatusData?.errorCount} error(s)</span>
          </div>
        )}

        {/* Actions */}
        <div className="card-actions justify-end mt-3">
          <Button variant="ghost" size="sm" aria-label={`View details for ${bot.name}`} onClick={() => setIsDiagnosticOpen(true)}>
            Details
          </Button>
        </div>
      </div>
    </Card>

    <DiagnosticModal 
       botId={bot.id}
       botName={bot.name}
       isOpen={isDiagnosticOpen}
       onClose={() => setIsDiagnosticOpen(false)}
    />

    <InsightsModal
       botId={bot.id}
       botName={bot.name}
       isOpen={isInsightsOpen}
       onClose={() => setIsInsightsOpen(false)}
    />

    <VersionHistoryModal
       botId={bot.id}
       botName={bot.name}
       isOpen={isHistoryOpen}
       onClose={() => setIsHistoryOpen(false)}
    />

    <BenchmarkModal
       botId={bot.id}
       botName={bot.name}
       isOpen={isBenchmarkOpen}
       onClose={() => setIsBenchmarkOpen(false)}
    />
    </>
  );
});

DashboardBotCard.displayName = 'DashboardBotCard';

export default DashboardBotCard;
