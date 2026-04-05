import React from 'react';
import { Bot, Plus, Download, Upload } from 'lucide-react';
import PageHeader from '../../components/DaisyUI/PageHeader';
import QuickAddButton from '../../components/BotManagement/QuickAddButton';
import Stack from '../../components/DaisyUI/Stack';

/** Stacked bot avatars shown as a visual accent next to the page title */
const SwarmAvatarStack: React.FC = () => {
  const colors = ['bg-primary', 'bg-secondary', 'bg-accent'];
  return (
    <Stack className="mr-2">
      {colors.map((color, i) => (
        <div
          key={i}
          className={`${color} text-primary-content w-8 h-8 rounded-full flex items-center justify-center shadow-sm`}
        >
          <Bot className="w-4 h-4" />
        </div>
      ))}
    </Stack>
  );
};

interface BotsPageHeaderProps {
  onExportAll: () => void;
  onImportClick: () => void;
  onCreateClick: () => void;
  onQuickAddMessage?: () => void;
  onQuickAddLLM?: () => void;
}

export const BotsPageHeader: React.FC<BotsPageHeaderProps> = ({
  onExportAll,
  onImportClick,
  onCreateClick,
  onQuickAddMessage,
  onQuickAddLLM,
}) => {
  return (
    <PageHeader
      title="AI Swarm Management"
      description="Configure, monitor, and deploy your specialized AI agents."
      icon={<SwarmAvatarStack />}
      actions={
        <div className="flex items-center gap-2">
          {onQuickAddMessage && (
            <QuickAddButton type="message" onClick={onQuickAddMessage} />
          )}
          {onQuickAddLLM && (
            <QuickAddButton type="llm" onClick={onQuickAddLLM} />
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={onExportAll}
            title="Export all bots"
          >
            <Download className="w-4 h-4 mr-1" /> Export All
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onImportClick}
            title="Import bots from file"
          >
            <Upload className="w-4 h-4 mr-1" /> Import
          </button>
          <button
            className="btn btn-primary"
            onClick={onCreateClick}
          >
            <Plus className="w-4 h-4 mr-2" /> Create New Bot
          </button>
        </div>
      }
    />
  );
};
