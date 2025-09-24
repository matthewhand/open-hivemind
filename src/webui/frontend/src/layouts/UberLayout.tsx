import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
  IconButton,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  SmartToy as BotIcon,
  Person as PersonaIcon,
  Build as MCPIcon,
  Security as GuardsIcon,
  Monitor as MonitorIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

const UberLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const hasRole = (role: string) => {
    return user?.role === role || user?.permissions?.includes(role);
  };

  const navigationItems = [
    {
      text: 'Overview',
      icon: <DashboardIcon />,
      path: '/uber/overview',
      visible: true,
    },
    {
      text: 'Bots',
      icon: <BotIcon />,
      path: '/uber/bots',
      visible: true,
    },
    {
      text: 'Personas',
      icon: <PersonaIcon />,
      path: '/uber/personas',
      visible: true,
    },
    {
      text: 'MCP Servers',
      icon: <MCPIcon />,
      path: '/uber/mcp',
      visible: hasRole('owner'),
    },
    {
      text: 'Guards',
      icon: <GuardsIcon />,
      path: '/uber/guards',
      visible: hasRole('owner'),
    },
    {
      text: 'Monitoring',
      icon: <MonitorIcon />,
      path: '/uber/monitoring',
      visible: true,
    },
    {
      text: 'Export',
      icon: <ExportIcon />,
      path: '/uber/export',
      visible: true,
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div">
          Open-Hivemind
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Uber Dashboard
        </Typography>
      </Box>
      <List>
        {navigationItems
          .filter(item => item.visible)
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.action.selected,
                    '&:hover': {
                      backgroundColor: theme.palette.action.selected,
                    },
                  },
                }}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar for mobile */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Uber Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation menu"
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '64px', md: 0 }, // Account for AppBar on mobile
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default UberLayout;