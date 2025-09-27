import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Search, ExpandMore } from '@mui/icons-material';
import { apiService } from '../services/api';
import type { ConfigResponse, ConfigSourcesResponse } from '../services/api';

const ConfigViewer: React.FC = () => {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [sources, setSources] = useState<ConfigSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configData, sourcesData] = await Promise.all([
          apiService.getConfig(),
          apiService.getConfigSources(),
        ]);
        setConfig(configData);
        setSources(sourcesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filterConfig = (data: any, term: string): any => {
    if (!term) return data;

    const filterObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.toLowerCase().includes(term.toLowerCase()) ? obj : null;
      }
      if (typeof obj === 'object' && obj !== null) {
        const filtered: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key.toLowerCase().includes(term.toLowerCase())) {
            filtered[key] = value;
          } else {
            const filteredValue = filterObject(value);
            if (filteredValue !== null) {
              filtered[key] = filteredValue;
            }
          }
        }
        return Object.keys(filtered).length > 0 ? filtered : null;
      }
      return null;
    };

    return filterObject(data);
  };

  const renderConfigTree = (data: any, path = ''): React.ReactNode => {
    if (data === null) return null;

    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.entries(data).map(([key, value]) => (
        <Accordion key={path + key} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {key}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {renderConfigTree(value, path + key + '.')}
          </AccordionDetails>
        </Accordion>
      ));
    }

    if (Array.isArray(data)) {
      return (
        <List dense>
          {data.map((item, index) => (
            <ListItem key={index}>
              <ListItemText primary={JSON.stringify(item, null, 2)} />
            </ListItem>
          ))}
        </List>
      );
    }

    return (
      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
        {typeof data === 'string' ? `"${data}"` : JSON.stringify(data)}
      </Typography>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const filteredConfig = config ? filterConfig(config, searchTerm) : null;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuration Viewer
      </Typography>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search configuration..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {config && (
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            Configuration Overview
          </Typography>
          <Box display="flex" gap={2} mb={2}>
            <Chip label={`Environment: ${config.environment}`} />
            <Chip label={`Legacy Mode: ${config.legacyMode ? 'Yes' : 'No'}`} />
            <Chip label={`Bots: ${config.bots.length}`} />
          </Box>
          {config.warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Warnings:</Typography>
              <ul>
                {config.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}
        </Box>
      )}

      {filteredConfig && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Configuration Tree
          </Typography>
          {renderConfigTree(filteredConfig)}
        </Paper>
      )}

      {sources && (
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Configuration Sources
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Environment Variables ({Object.keys(sources.environmentVariables).length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {Object.entries(sources.environmentVariables).map(([key, value]: [string, any]) => (
                  <ListItem key={key}>
                    <ListItemText
                      primary={key}
                      secondary={
                        <Box>
                          <Typography variant="body2" component="span">
                            Source: {value.source}
                          </Typography>
                          {value.sensitive && (
                            <Chip label="Sensitive" size="small" color="warning" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Configuration Files ({sources.configFiles.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {sources.configFiles.map((file: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={file.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" component="span">
                            Type: {file.type} | Size: {file.size} bytes
                          </Typography>
                          <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                            Modified: {new Date(file.modified).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Overrides ({sources.overrides.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {sources.overrides.map((override: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={override.key}
                      secondary={
                        <Box>
                          <Typography variant="body2" component="span">
                            Bot: {override.bot} | Type: {override.type}
                          </Typography>
                          {override.value && (
                            <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                              Value: {override.value}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Container>
  );
};

export default ConfigViewer;