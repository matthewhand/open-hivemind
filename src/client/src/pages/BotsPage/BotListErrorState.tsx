import React from 'react';
import { AlertCircle, RefreshCw, AlertTriangle, Bot } from 'lucide-react';
import Button from '../../components/DaisyUI/Button';
import EmptyState from '../../components/DaisyUI/EmptyState';
import { Alert } from '../../components/DaisyUI/Alert';

interface BotListErrorStateProps {
  error: string | null;
  botsCount: number;
  fetchBots: () => void;
  filteredBotsCount: number;
  searchQuery: string;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const BotListErrorState: React.FC<BotListErrorStateProps> = ({
  error,
  botsCount,
  fetchBots,
  filteredBotsCount,
  searchQuery,
  setIsCreateModalOpen,
}) => {
  if (error && botsCount > 0) {
    return (
      <Alert status="error" className="shadow-sm mb-4">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
        <Button variant="ghost" size="xs" onClick={fetchBots}>Try Again</Button>
      </Alert>
    );
  }

  if (error && botsCount === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to load swarm"
        description="We encountered an error while trying to load your AI agents. Please try again."
        actionLabel={
          <Button variant="primary" buttonStyle="outline" className="btn-error" onClick={fetchBots}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
        }
      />
    );
  }

  if (filteredBotsCount === 0) {
    return (
      <EmptyState
        icon={Bot}
        title={searchQuery ? "No agents found" : "Your swarm is empty"}
        description={searchQuery ? "No agents match your search criteria." : "Start by creating your first specialized AI agent."}
        actionLabel={
          !searchQuery ? (
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              Create First Bot
            </Button>
          ) : undefined
        }
      />
    );
  }

  return null;
};
