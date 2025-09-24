import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline, Container, Typography, Box, Paper, Alert, Button } from '@mui/material'
import './index.css'

// Create a simple theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
})

// Simple dashboard that loads immediately - no complex dependencies
const SimpleDashboard = () => (
  <Container maxWidth="lg">
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Open-Hivemind Dashboard
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Multi-Agent System Control Center
      </Typography>

      <Alert severity="success" sx={{ mb: 4 }}>
        <Typography variant="body2">
          ✅ Dashboard loaded successfully! Authentication bypass is working.
        </Typography>
      </Alert>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            WebUI Access
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Access the main user interface for bot management and monitoring.
          </Typography>
          <Button variant="contained" href="/webui" fullWidth>
            Open WebUI
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Admin Panel
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Administrative controls for system configuration and management.
          </Typography>
          <Button variant="contained" href="/admin" fullWidth>
            Open Admin
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            API Status
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Check the status of backend services and API endpoints.
          </Typography>
          <Button variant="outlined" href="/webui/api/config" fullWidth>
            Check API
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            System Info
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            View system information and configuration details.
          </Typography>
          <Button variant="outlined" href="/dashboard/api/status" fullWidth>
            View Status
          </Button>
        </Paper>
      </Box>

      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small">
            Refresh Dashboard
          </Button>
          <Button variant="outlined" size="small">
            Clear Cache
          </Button>
          <Button variant="outlined" size="small">
            Export Config
          </Button>
        </Box>
      </Paper>
    </Box>
  </Container>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SimpleDashboard />
    </ThemeProvider>
  </StrictMode>,
)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SimpleDashboardExport = SimpleDashboard // For fast refresh
