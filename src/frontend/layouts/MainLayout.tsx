import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemText, Toolbar, Typography, AppBar, useTheme, useMediaQuery } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../contexts/ThemeEngine';

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navItems = [
    { label: 'WebUI', to: '/webui' },
    { label: 'Admin', to: '/admin' },
    { label: 'Settings', to: '/admin/settings' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Open-Hivemind Dashboard
          </Typography>
          <ThemeToggle />
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
            Open-Hivemind
          </Typography>
        </Toolbar>
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.to} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.to}
                  selected={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // Account for AppBar height
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
