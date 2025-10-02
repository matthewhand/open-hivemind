import React, { createContext, useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setCurrentTenant } from '../store/slices/authSlice';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon
} from '@mui/material';
import { Business as BusinessIcon, Person as PersonIcon } from '@mui/icons-material';
import { AnimatedBox } from '../animations/AnimationComponents';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'pro' | 'enterprise';
  maxBots: number;
  maxUsers: number;
  storageQuota: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
}

interface MultiTenantContextType {
  currentTenant: Tenant | null;
  tenantUsers: TenantUser[];
  availableTenants: Tenant[];
  switchTenant: (tenantId: string) => Promise<void>;
  createTenant: (tenantData: Partial<Tenant>) => Promise<Tenant>;
  updateTenant: (tenantId: string, updates: Partial<Tenant>) => Promise<void>;
  deleteTenant: (tenantId: string) => Promise<void>;
  inviteUser: (email: string, role: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  updateUserRole: (userId: string, newRole: string) => Promise<void>;
  canAccessFeature: (feature: string) => boolean;
  getStorageUsage: () => { used: number; total: number; percentage: number };
  getBotUsage: () => { used: number; total: number; percentage: number };
  getUserUsage: () => { used: number; total: number; percentage: number };
}

const MultiTenantContext = createContext<MultiTenantContextType | undefined>(undefined);


interface MultiTenantProviderProps {
  children: React.ReactNode;
}

// Mock tenant data for demonstration
const mockTenants: Tenant[] = [
  {
    id: 'tenant-001',
    name: 'Open-Hivemind Dev',
    domain: 'dev.open-hivemind.com',
    plan: 'enterprise',
    maxBots: 100,
    maxUsers: 50,
    storageQuota: 10737418240, // 10GB
    features: ['multi-tenant', 'advanced-analytics', 'ai-insights', 'custom-widgets', 'priority-support'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    expiresAt: new Date('2025-12-31'),
  },
  {
    id: 'tenant-002',
    name: 'Enterprise Demo',
    domain: 'demo.enterprise.com',
    plan: 'enterprise',
    maxBots: 500,
    maxUsers: 200,
    storageQuota: 53687091200, // 50GB
    features: ['multi-tenant', 'advanced-analytics', 'ai-insights', 'custom-widgets', 'priority-support', 'white-label'],
    isActive: true,
    createdAt: new Date('2024-03-15'),
  },
  {
    id: 'tenant-003',
    name: 'Pro Account',
    domain: 'pro.user.com',
    plan: 'pro',
    maxBots: 25,
    maxUsers: 10,
    storageQuota: 2147483648, // 2GB
    features: ['multi-tenant', 'advanced-analytics', 'ai-insights'],
    isActive: true,
    createdAt: new Date('2024-06-01'),
    expiresAt: new Date('2024-12-31'),
  },
];

const mockUsers: TenantUser[] = [
  {
    id: 'user-001',
    tenantId: 'tenant-001',
    username: 'admin',
    email: 'admin@open-hivemind.com',
    role: 'owner',
    permissions: ['*'],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user-002',
    tenantId: 'tenant-001',
    username: 'developer',
    email: 'dev@open-hivemind.com',
    role: 'admin',
    permissions: ['view-dashboard', 'manage-bots', 'view-config', 'view-performance'],
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'user-003',
    tenantId: 'tenant-002',
    username: 'enterprise-user',
    email: 'user@enterprise.com',
    role: 'admin',
    permissions: ['view-dashboard', 'manage-bots', 'view-config', 'view-performance', 'manage-users'],
    createdAt: new Date('2024-03-15'),
  },
];

export const MultiTenantProvider: React.FC<MultiTenantProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(mockTenants[0]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>(mockUsers);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>(mockTenants);

  // Tenant management functions
  const switchTenant = async (tenantId: string): Promise<void> => {
    const tenant = availableTenants.find(t => t.id === tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (!tenant.isActive) {
      throw new Error('Tenant is not active');
    }

    if (tenant.expiresAt && new Date() > tenant.expiresAt) {
      throw new Error('Tenant subscription has expired');
    }

    dispatch(setCurrentTenant(tenant));
    
    // Clear tenant-specific data
    // This would typically involve clearing Redux state and reloading data
    console.log(`Switched to tenant: ${tenant.name}`);
  };

  const createTenant = async (tenantData: Partial<Tenant>): Promise<Tenant> => {
    // Validate tenant data
    if (!tenantData.name || !tenantData.domain) {
      throw new Error('Tenant name and domain are required');
    }

    // Check if domain is available
    const domainExists = availableTenants.some(t => t.domain === tenantData.domain);
    if (domainExists) {
      throw new Error('Domain already exists');
    }

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: tenantData.name,
      domain: tenantData.domain,
      plan: tenantData.plan || 'free',
      maxBots: tenantData.maxBots || 5,
      maxUsers: tenantData.maxUsers || 3,
      storageQuota: tenantData.storageQuota || 1073741824, // 1GB default
      features: tenantData.features || ['basic'],
      isActive: true,
      createdAt: new Date(),
      ...tenantData,
    };

    setAvailableTenants(prev => [...prev, newTenant]);
    return newTenant;
  };

  const updateTenant = async (tenantId: string, updates: Partial<Tenant>): Promise<void> => {
    const updatedTenants = availableTenants.map(tenant =>
      tenant.id === tenantId ? { ...tenant, ...updates } : tenant
    );
    setAvailableTenants(updatedTenants);

    if (currentTenant?.id === tenantId) {
      setCurrentTenant(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteTenant = async (tenantId: string): Promise<void> => {
    if (currentTenant?.id === tenantId) {
      throw new Error('Cannot delete current tenant');
    }

    setAvailableTenants(prev => prev.filter(t => t.id !== tenantId));
    setTenantUsers(prev => prev.filter(u => u.tenantId !== tenantId));
  };

  // User management functions
  const inviteUser = async (email: string, role: string): Promise<void> => {
    if (!currentTenant) {
      throw new Error('No tenant selected');
    }

    // Check if user limit is reached
    const tenantUserCount = tenantUsers.filter(u => u.tenantId === currentTenant.id).length;
    if (tenantUserCount >= currentTenant.maxUsers) {
      throw new Error('Maximum user limit reached for this tenant');
    }

    const newUser: TenantUser = {
      id: `user-${Date.now()}`,
      tenantId: currentTenant.id,
      username: email.split('@')[0],
      email,
      role: role as TenantUser['role'],
      permissions: getRolePermissions(role),
      createdAt: new Date(),
    };

    setTenantUsers(prev => [...prev, newUser]);
  };

  const removeUser = async (userId: string): Promise<void> => {
    const user = tenantUsers.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'owner') {
      throw new Error('Cannot remove tenant owner');
    }

    setTenantUsers(prev => prev.filter(u => u.id !== userId));
  };

  const updateUserRole = async (userId: string, newRole: string): Promise<void> => {
    const updatedUsers = tenantUsers.map(user =>
      user.id === userId ? { ...user, role: newRole as TenantUser['role'] } : user
    );
    setTenantUsers(updatedUsers);
  };

  // Utility functions
  const canAccessFeature = (feature: string): boolean => {
    if (!currentTenant) return false;
    return currentTenant.features.includes(feature);
  };

  const getStorageUsage = () => {
    if (!currentTenant) return { used: 0, total: 0, percentage: 0 };
    
    // Simulate storage usage
    const used = Math.floor(Math.random() * currentTenant.storageQuota);
    const percentage = (used / currentTenant.storageQuota) * 100;
    
    return {
      used,
      total: currentTenant.storageQuota,
      percentage,
    };
  };

  const getBotUsage = () => {
    if (!currentTenant) return { used: 0, total: 0, percentage: 0 };
    
    // Simulate bot usage
    const used = Math.floor(Math.random() * currentTenant.maxBots);
    const percentage = (used / currentTenant.maxBots) * 100;
    
    return {
      used,
      total: currentTenant.maxBots,
      percentage,
    };
  };

  const getUserUsage = () => {
    if (!currentTenant) return { used: 0, total: 0, percentage: 0 };
    
    const used = tenantUsers.filter(u => u.tenantId === currentTenant.id).length;
    const percentage = (used / currentTenant.maxUsers) * 100;
    
    return {
      used,
      total: currentTenant.maxUsers,
      percentage,
    };
  };

  const getRolePermissions = (role: string): string[] => {
    const permissionMap: Record<string, string[]> = {
      owner: ['*'],
      admin: ['view-dashboard', 'manage-bots', 'view-config', 'view-performance', 'manage-users'],
      member: ['view-dashboard', 'view-bots', 'view-config', 'view-performance'],
      viewer: ['view-dashboard', 'view-bots', 'view-config'],
    };
    return permissionMap[role] || [];
  };

  const contextValue: MultiTenantContextType = {
    currentTenant,
    tenantUsers,
    availableTenants,
    switchTenant,
    createTenant,
    updateTenant,
    deleteTenant,
    inviteUser,
    removeUser,
    updateUserRole,
    canAccessFeature,
    getStorageUsage,
    getBotUsage,
    getUserUsage,
  };

  if (!currentTenant) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <BusinessIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Tenant Selected
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please select a tenant to access the dashboard features.
            </Typography>
          </CardContent>
        </Card>
      </AnimatedBox>
    );
  }

  // Check if current user has access to current tenant
  const currentUser = tenantUsers.find(u => u.tenantId === currentTenant.id);
  if (!currentUser) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3 }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          Access Denied: You don't have permission to access this tenant.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Please contact your administrator to request access.
        </Typography>
      </AnimatedBox>
    );
  }

  return (
    <MultiTenantContext.Provider value={contextValue}>
      <AnimatedBox
        animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        sx={{ width: '100%' }}
      >
        {/* Tenant Header */}
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <BusinessIcon color="primary" />
                <Box>
                  <Typography variant="h6">
                    {currentTenant.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentTenant.domain} • {currentTenant.plan.toUpperCase()} Plan
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={`${currentTenant.maxBots} Bots`}
                  size="small"
                  color={getBotUsage().percentage > 80 ? 'warning' : 'default'}
                />
                <Chip
                  label={`${currentTenant.maxUsers} Users`}
                  size="small"
                  color={getUserUsage().percentage > 80 ? 'warning' : 'default'}
                />
                <Chip
                  label={currentTenant.plan}
                  color="primary"
                  size="small"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Usage Metrics */}
        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={2} mb={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bot Usage
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h4" color={getBotUsage().percentage > 80 ? 'warning.main' : 'primary.main'}>
                  {getBotUsage().used}/{getBotUsage().total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getBotUsage().percentage.toFixed(1)}% used
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Usage
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h4" color={getUserUsage().percentage > 80 ? 'warning.main' : 'primary.main'}>
                  {getUserUsage().used}/{getUserUsage().total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getUserUsage().percentage.toFixed(1)}% used
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Usage
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h4" color={getStorageUsage().percentage > 80 ? 'warning.main' : 'primary.main'}>
                  {(getStorageUsage().used / 1024 / 1024 / 1024).toFixed(1)}GB
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(getStorageUsage().total / 1024 / 1024 / 1024).toFixed(1)}GB total
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Active Features */}
        {currentTenant.features.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Features
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {currentTenant.features.map((feature) => (
                  <Chip
                    key={feature}
                    label={feature.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Tenant Users */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Team Members ({tenantUsers.filter(u => u.tenantId === currentTenant.id).length})
            </Typography>
            <List sx={{ p: 0 }}>
              {tenantUsers
                .filter(user => user.tenantId === currentTenant.id)
                .map((user) => (
                  <ListItem key={user.id} divider>
                    <ListItemIcon>
                      <PersonIcon color={user.role === 'owner' ? 'primary' : 'action'} />
                    </ListItemIcon>
                    <Box flex={1}>
                      <Typography variant="subtitle2">
                        {user.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email} • {user.role}
                      </Typography>
                    </Box>
                    <Chip
                      label={user.role}
                      size="small"
                      color={user.role === 'owner' ? 'primary' : 'default'}
                    />
                  </ListItem>
                ))}
            </List>
          </CardContent>
        </Card>
      </AnimatedBox>
    </MultiTenantContext.Provider>
  );
};

export default MultiTenantProvider;

// Export types for external use
// Export types
export type { MultiTenantContextType };