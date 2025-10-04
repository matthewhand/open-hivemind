import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemText, Toolbar, Typography } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { MobileDrawer } from '../components/DaisyUI';

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navItems = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Admin', to: '/admin' },
  ];

  return (
    <>
      {/* Mobile Drawer - Hidden on lg screens and up */}
      <div className="lg:hidden">
        <MobileDrawer navItems={navItems}>
          <Box component="main" sx={{ p: 2 }}>
            {children}
          </Box>
        </MobileDrawer>
      </div>

      {/* Desktop Layout - Hidden on smaller screens */}
      <Box sx={{ display: { xs: 'none', lg: 'flex' } }}>
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          <Toolbar>
            <Typography variant="h6" noWrap>
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
                  >
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          {children}
        </Box>
      </Box>
    </>
  );
};

export default MainLayout;
