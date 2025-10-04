import React from 'react';
import { Box, Typography } from '@mui/material';
import ActivityMonitor from '../components/ActivityMonitor';

const StandaloneActivity: React.FC = () => {
  return (
    <Box className="min-h-screen bg-base-200">
      <ActivityMonitor showPopoutButton={false} autoRefresh={true} />
    </Box>
  );
};

export default StandaloneActivity;