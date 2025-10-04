import React from 'react';
import { Box, Typography } from '@mui/material';
import { Breadcrumbs } from '../components/DaisyUI';
import ActivityMonitor from '../components/ActivityMonitor';

const ActivityPage: React.FC = () => {
  const breadcrumbItems = [
    { label: 'Activity Monitor', href: '/admin/activity', isActive: true }
  ];

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Activity Monitor
        </Typography>
        <Breadcrumbs items={breadcrumbItems} />
      </Box>

      <ActivityMonitor showPopoutButton={true} />
    </Box>
  );
};

export default ActivityPage;