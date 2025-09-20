import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip
} from '@mui/material';
import { getEnvOverrides } from '../services/agentService';

const EnvMonitor: React.FC = () => {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvOverrides = async () => {
    try {
      setLoading(true);
      const data = await getEnvOverrides();
      setEnvVars(data);
    } catch (err) {
      setError('Failed to fetch environment variable overrides');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnvOverrides();
  }, []);

  if (loading) {
    return <Typography>Loading environment variables...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Environment Variable Overrides
      </Typography>
      
      {Object.keys(envVars).length === 0 ? (
        <Typography>No environment variable overrides detected</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Environment Variable</TableCell>
                <TableCell>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(envVars).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell>
                    <Chip 
                      label={key} 
                      size="small" 
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.8rem'
                      }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={value} 
                      size="small" 
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        backgroundColor: '#1976d2',
                        color: 'white'
                      }} 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default EnvMonitor;