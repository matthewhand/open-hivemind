import React from 'react';
import AgentCard from './AgentCard';
import { useAgents } from '../../hooks/useAgents';

interface AgentGridProps {
  configurable?: boolean;
}

const AgentGrid: React.FC<AgentGridProps> = ({ configurable }) => {
  const { agents, loading, error } = useAgents();

  if (loading) {
    return <p className="text-base-content">Loading agents...</p>;
  }

  if (error) {
    return <p className="text-error">{error}</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard key={agent.name} agent={agent} configurable={configurable} />
      ))}
    </div>
  );
};

export default AgentGrid;
