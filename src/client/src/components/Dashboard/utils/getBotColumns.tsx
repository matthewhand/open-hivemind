import React from 'react';
import Badge from '../../DaisyUI/Badge';
import { BotTableRow } from '../UnifiedDashboard';
import { getProviderEmoji } from '../../utils/providerEmoji';
import { buildLastActivityLabel } from '../../utils/buildLastActivityLabel';
import { getStatusBadgeVariant } from '../../utils/getStatusBadgeVariant';
import { Link } from 'react-router-dom';
import Button from '../../DaisyUI/Button';
import { Info } from 'lucide-react';

export function getBotColumns() {
  return [
    {
      header: 'Agent Name',
      accessor: 'name' as keyof BotTableRow,
      render: (bot: BotTableRow) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-8">
              <span className="text-xl" aria-hidden>
                {getProviderEmoji(bot.provider)}
              </span>
            </div>
          </div>
          <div>
            <div className="font-bold">{bot.name}</div>
            <div className="text-sm opacity-50 flex items-center gap-1">
              {bot.persona || 'Default Persona'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Platform',
      accessor: 'provider' as keyof BotTableRow,
      render: (bot: BotTableRow) => (
        <span className="capitalize">{bot.provider}</span>
      ),
    },
    {
      header: 'Intelligence',
      accessor: 'llm' as keyof BotTableRow,
      render: (bot: BotTableRow) => (
        <span className="capitalize">{bot.llm || 'System Default'}</span>
      ),
    },
    {
      header: 'Security',
      accessor: 'guard' as keyof BotTableRow,
      render: (bot: BotTableRow) => {
        let variant: 'success' | 'warning' | 'neutral' = 'neutral';
        if (bot.guard === 'Custom Guard') variant = 'success';
        if (bot.guard === 'Unguarded') variant = 'warning';
        return <Badge variant={variant} size="small">{bot.guard}</Badge>;
      },
    },
    {
      header: 'Status',
      accessor: 'status' as keyof BotTableRow,
      render: (bot: BotTableRow) => (
        <div className="flex flex-col gap-1">
          <Badge variant={getStatusBadgeVariant(bot.status)} size="small">
            {bot.status.toUpperCase()}
          </Badge>
          <span className="text-xs text-base-content/60">
            {bot.connected ? 'Online' : 'Offline'}
          </span>
        </div>
      ),
    },
    {
      header: 'Activity',
      accessor: 'messageCount' as keyof BotTableRow,
      render: (bot: BotTableRow) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{bot.messageCount} messages</span>
          <span className="text-xs text-base-content/60">
            {buildLastActivityLabel(bot.messageCount, bot.connected)}
          </span>
        </div>
      ),
    },
    {
      header: 'Errors',
      accessor: 'errorCount' as keyof BotTableRow,
      render: (bot: BotTableRow) => (
        <Badge
          variant={bot.errorCount > 0 ? 'error' : 'ghost'}
          size="small"
        >
          {bot.errorCount}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof BotTableRow,
      render: (bot: BotTableRow) => (
        <Link to={`/admin/bots?id=${bot.name}`}>
          <Button variant="ghost" size="small" startIcon={<Info className="w-4 h-4" />}>
            Details
          </Button>
        </Link>
      ),
    },
  ];
}
