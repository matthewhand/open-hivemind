import React, { memo } from 'react';
import AgentCard from './AgentCard';
import { useAgents } from '../../hooks/useAgents';
import { SkeletonGrid } from '../DaisyUI/Skeleton';
import EmptyState from '../DaisyUI/EmptyState';
import { X } from 'lucide-react';

interface AgentGridProps {
  configurable?: boolean;
}

const AgentGrid: React.FC<AgentGridProps> = ({ configurable }) => {
  const { agents, loading, error } = useAgents();

  if (loading) {
    return (
      <div aria-live="polite" aria-busy="true">
        <SkeletonGrid count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div aria-live="polite">
        <EmptyState variant="error" icon={X} title="Failed to load agents" description={error} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard key={agent.name} agent={agent} configurable={configurable} />
      ))}
    </div>
  );
};

// ⚡ Bolt Optimization: Added memo() to prevent unnecessary re-renders when parent state changes
export default memo(AgentGrid);
