import React from 'react';
import { Grid, Typography } from '@mui/material';
import AgentCard from './AgentCard';
import { useAgents } from '../../hooks/useAgents';

interface AgentGridProps {
  configurable?: boolean;
}

const AgentGrid: React.FC<AgentGridProps> = ({ configurable }) => {
  const { agents, loading, error } = useAgents();

  if (loading) {
    return <Typography>Loading agents...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Grid container spacing={3}>
      {agents.map((agent) => (
        <Grid item xs={12} sm={6} md={4} key={agent.name}>
          <AgentCard agent={agent} configurable={configurable} />
        </Grid>
      ))}
    </Grid>
  );
};

export default AgentGrid;
