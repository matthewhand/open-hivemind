import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import ConfigurationEditor from '../components/ConfigurationEditor';

const BotConfigurationPage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <ConfigurationEditor />
      </Box>
    </Container>
  );
};

export default BotConfigurationPage;