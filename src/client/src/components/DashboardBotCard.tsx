import React, { memo, useState } from 'react';
import PersonaAvatar from './PersonaAvatar';
import Badge from './DaisyUI/Badge';
import Card from './DaisyUI/Card';
import Button from './DaisyUI/Button';
import type { Bot, StatusResponse } from '../services/api';
import { Activity } from 'lucide-react';
import DiagnosticModal from './BotManagement/DiagnosticModal';

interface DashboardBotCardProps {
  bot: Bot;
  botStatusData: StatusResponse['bots'][0] | undefined;
  rating: number;
  onRatingChange: (botName: string, rating: number) => void;
  getProviderIcon: (provider: string) => string;
  getStatusColor: (status: string) => string;
}

/** Map status strings to valid Badge variants. */
const toBadgeVariant = (color: string): 'success' | 'warning' | 'error' | 'neutral' => {
  if (color === 'success') return 'success';
  if (color === 'warning') return 'warning';
  if (color === 'error') return 'error';
  return 'neutral';
};

const DashboardBotCard: React.FC<DashboardBotCardProps> = memo(({
  bot,
  botStatusData,
  getStatusColor,
}) => {
  const botStatus = botStatusData?.status || 'unknown';
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

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
               <button 
                 onClick={() => setIsDiagnosticOpen(true)}
                 className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity"
                 title="Run Diagnostic"
               >
                  <Activity className="w-4 h-4" />
               </button>
               <Badge
                variant={toBadgeVariant(getStatusColor(botStatus))}
                size="small"
              >
                {botStatus.toUpperCase()}
              </Badge>
            </div>
          </div>

        {/* Provider badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge variant="neutral" size="small">
            {bot.messageProvider}
          </Badge>
          {bot.llmProvider && (
            <Badge variant="secondary" size="small">
              {bot.llmProvider}
            </Badge>
          )}
          <Badge variant="neutral" style="outline" className="text-xs">
            📱 {bot.messageProvider.toUpperCase()}
          </Badge>
        </div>

        {/* Error alert (only when errors exist) */}
        {(botStatusData?.errorCount ?? 0) > 0 && (
          <div className="alert alert-error py-2 mt-3">
            <span className="text-xs">{botStatusData?.errorCount} error(s)</span>
          </div>
        )}

        {/* Actions */}
        <div className="card-actions justify-end mt-3">
          <Button variant="outline" size="sm">
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
    </>
  );
});

DashboardBotCard.displayName = 'DashboardBotCard';

export default DashboardBotCard;
