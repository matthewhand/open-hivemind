import React from 'react';
import { Bot, Plus, Download, Upload } from 'lucide-react';
import PageHeader from '../../components/DaisyUI/PageHeader';

interface BotsPageHeaderProps {
  onExportAll: () => void;
  onImportClick: () => void;
  onCreateClick: () => void;
}

export const BotsPageHeader: React.FC<BotsPageHeaderProps> = ({
  onExportAll,
  onImportClick,
  onCreateClick,
}) => {
  return (
    <PageHeader
      title="AI Swarm Management"
      description="Configure, monitor, and deploy your specialized AI agents."
      icon={<Bot className="w-8 h-8 text-primary" />}
      actions={
        <div className="flex gap-2">
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
