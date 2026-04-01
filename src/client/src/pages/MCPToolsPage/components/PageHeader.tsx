import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface PageHeaderProps {
  onShowHistory: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ onShowHistory }) => {
  return (
    <div className="mb-8 flex justify-between items-start">
      <div><h1 className="text-3xl font-bold mb-2">MCP Tools</h1><p className="text-base-content/70">Browse and manage tools available from your MCP servers</p></div>
      <button className="btn btn-outline btn-sm" onClick={onShowHistory}><ClockIcon className="w-4 h-4 mr-1" /> Execution History</button>
    </div>
  );
};

export default PageHeader;
