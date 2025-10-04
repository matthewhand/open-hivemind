import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const LoadingPage: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 3000; // 3 seconds
    const intervalDuration = 100; // Update every 100ms
    const totalSteps = totalDuration / intervalDuration;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / totalSteps);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            navigate('/dashboard');
          }, 200); // Small delay after reaching 100%
          return 100;
        }
        return next;
      });
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        textAlign="center"
        gap={4}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Open-Hivemind
        </Typography>

        <Typography variant="h6" color="text.secondary" gutterBottom>
          Initializing AI Network Dashboard
        </Typography>

        <Box display="flex" flexDirection="column" alignItems="center" gap={2} width="100%" maxWidth={400}>
          <LoadingSpinner size="lg" variant="infinity" />

          <Box width="100%">
            <div className="w-full bg-base-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {Math.round(progress)}% Complete
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Preparing your intelligent workspace...
        </Typography>
      </Box>
    </Container>
  );
};

export default LoadingPage;