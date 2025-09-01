import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import Dashboard from './components/Dashboard';
import ConfigViewer from './components/ConfigViewer';
import HotReloadManager from './components/HotReloadManager';
import BotManager from './components/BotManager';
import SecureConfigManager from './components/SecureConfigManager';
import ConfigurationWizard from './components/ConfigurationWizard';
import EnvironmentManager from './components/EnvironmentManager';
import ConfigurationAnalytics from './components/ConfigurationAnalytics';
import CIDeploymentManager from './components/CIDeploymentManager';
import EnterpriseManager from './components/EnterpriseManager';
import { apiService } from './services/api';
import type { Bot } from './services/api';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const BotManagerWrapper: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBots = async () => {
    try {
      const response = await apiService.getConfig();
      setBots(response.bots);
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleBotChange = () => {
    fetchBots();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return <BotManager bots={bots} onBotChange={handleBotChange} />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Open-Hivemind WebUI
            </Typography>
            <Button color="inherit" component={Link} to="/">
              Dashboard
            </Button>
            <Button color="inherit" component={Link} to="/bots">
              Bot Manager
            </Button>
            <Button color="inherit" component={Link} to="/config">
              Configuration
            </Button>
            <Button color="inherit" component={Link} to="/secure">
              Secure Config
            </Button>
            <Button color="inherit" component={Link} to="/hot-reload">
              Hot Reload
            </Button>
            <Button color="inherit" component={Link} to="/wizard">
              Setup Wizard
            </Button>
            <Button color="inherit" component={Link} to="/environments">
              Environments
            </Button>
            <Button color="inherit" component={Link} to="/analytics">
              Analytics
            </Button>
            <Button color="inherit" component={Link} to="/ci-cd">
              CI/CD
            </Button>
            <Button color="inherit" component={Link} to="/enterprise">
              Enterprise
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bots" element={<BotManagerWrapper />} />
            <Route path="/config" element={<ConfigViewer />} />
            <Route path="/secure" element={<SecureConfigManager />} />
            <Route path="/hot-reload" element={<HotReloadManager />} />
            <Route path="/wizard" element={<ConfigurationWizard />} />
            <Route path="/environments" element={<EnvironmentManager />} />
            <Route path="/analytics" element={<ConfigurationAnalytics />} />
            <Route path="/ci-cd" element={<CIDeploymentManager />} />
            <Route path="/enterprise" element={<EnterpriseManager />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;
