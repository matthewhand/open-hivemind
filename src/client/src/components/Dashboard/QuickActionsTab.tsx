import React from 'react';
import { Bot, Users, Database, LayoutGrid } from 'lucide-react';
import Card from '../DaisyUI/Card';

interface QuickActionsTabProps {
  handleOpenCreateModal: () => void;
  navigate: (path: string) => void;
}

export const QuickActionsTab: React.FC<QuickActionsTabProps> = ({ handleOpenCreateModal, navigate }) => {
  return (
    <Card className="bg-base-100 shadow-xl border border-base-200">
      <Card.Body>
        <Card.Title className="mb-6">Quick Actions</Card.Title>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handleOpenCreateModal}
            className="flex flex-col items-center justify-center p-6 bg-base-200 rounded-xl hover:bg-primary hover:text-primary-content transition-all group"
          >
            <Bot className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Create Bot</span>
            <span className="text-xs opacity-70 mt-1">Configure a new AI assistant</span>
          </button>

          <button
            onClick={() => navigate('/personas')}
            className="flex flex-col items-center justify-center p-6 bg-base-200 rounded-xl hover:bg-secondary hover:text-secondary-content transition-all group"
          >
            <Users className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Manage Personas</span>
            <span className="text-xs opacity-70 mt-1">Define personality profiles</span>
          </button>

          <button
            onClick={() => navigate('/providers')}
            className="flex flex-col items-center justify-center p-6 bg-base-200 rounded-xl hover:bg-accent hover:text-accent-content transition-all group"
          >
            <Database className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Configure LLMs</span>
            <span className="text-xs opacity-70 mt-1">Set up AI models</span>
          </button>

          <button
            onClick={() => navigate('/integrations')}
            className="flex flex-col items-center justify-center p-6 bg-base-200 rounded-xl hover:bg-info hover:text-info-content transition-all group"
          >
            <LayoutGrid className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Integrations</span>
            <span className="text-xs opacity-70 mt-1">Connect external tools</span>
          </button>
        </div>
      </Card.Body>
    </Card>
  );
};
