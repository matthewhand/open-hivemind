import React, { createContext, useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setCurrentTenant } from '../store/slices/authSlice';
import {
  BuildingOfficeIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
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
        animation="fade-in"
        duration={300}
      >
        <div className="p-6 flex justify-center items-center min-h-[400px]">
          <div className="card bg-base-100 shadow-xl max-w-sm text-center">
            <div className="card-body items-center">
              <BuildingOfficeIcon className="w-16 h-16 text-primary mb-4" />
              <h2 className="card-title text-2xl mb-2">No Tenant Selected</h2>
              <p className="text-base-content/70">
                Please select a tenant to access the dashboard features.
              </p>
            </div>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  // Check if current user has access to current tenant
  const currentUser = tenantUsers.find(u => u.tenantId === currentTenant.id);
  if (!currentUser) {
    return (
      <AnimatedBox
        animation="fade-in"
        duration={300}
      >
        <div className="p-6">
          <div className="alert alert-error shadow-lg mb-4">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <div>
              <h3 className="font-bold">Access Denied</h3>
              <div className="text-xs">You don't have permission to access this tenant.</div>
            </div>
          </div>
          <p className="text-base-content/70">
            Please contact your administrator to request access.
          </p>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <MultiTenantContext.Provider value={contextValue}>
      <AnimatedBox
        animation="fade-in"
        duration={300}
      >
        <div className="w-full">
          {/* Tenant Header */}
          <div className="card bg-base-100 shadow-xl mb-6 border-l-4 border-primary">
            <div className="card-body">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <BuildingOfficeIcon className="w-8 h-8 text-primary" />
                  <div>
                    <h2 className="card-title text-xl">
                      {currentTenant.name}
                    </h2>
                    <p className="text-sm text-base-content/70">
                      {currentTenant.domain} • {currentTenant.plan.toUpperCase()} Plan
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`badge ${getBotUsage().percentage > 80 ? 'badge-warning' : 'badge-ghost'} badge-lg`}>
                    {currentTenant.maxBots} Bots
                  </div>
                  <div className={`badge ${getUserUsage().percentage > 80 ? 'badge-warning' : 'badge-ghost'} badge-lg`}>
                    {currentTenant.maxUsers} Users
                  </div>
                  <div className="badge badge-primary badge-lg">
                    {currentTenant.plan}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Bot Usage</h3>
                <div className="flex justify-between items-center">
                  <span className={`text-3xl font-bold ${getBotUsage().percentage > 80 ? 'text-warning' : 'text-primary'}`}>
                    {getBotUsage().used}/{getBotUsage().total}
                  </span>
                  <span className="text-sm text-base-content/70">
                    {getBotUsage().percentage.toFixed(1)}% used
                  </span>
                </div>
                <progress
                  className={`progress ${getBotUsage().percentage > 80 ? 'progress-warning' : 'progress-primary'} w-full mt-2`}
                  value={getBotUsage().percentage}
                  max="100"
                ></progress>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">User Usage</h3>
                <div className="flex justify-between items-center">
                  <span className={`text-3xl font-bold ${getUserUsage().percentage > 80 ? 'text-warning' : 'text-primary'}`}>
                    {getUserUsage().used}/{getUserUsage().total}
                  </span>
                  <span className="text-sm text-base-content/70">
                    {getUserUsage().percentage.toFixed(1)}% used
                  </span>
                </div>
                <progress
                  className={`progress ${getUserUsage().percentage > 80 ? 'progress-warning' : 'progress-primary'} w-full mt-2`}
                  value={getUserUsage().percentage}
                  max="100"
                ></progress>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Storage Usage</h3>
                <div className="flex justify-between items-center">
                  <span className={`text-3xl font-bold ${getStorageUsage().percentage > 80 ? 'text-warning' : 'text-primary'}`}>
                    {(getStorageUsage().used / 1024 / 1024 / 1024).toFixed(1)}GB
                  </span>
                  <span className="text-sm text-base-content/70">
                    {(getStorageUsage().total / 1024 / 1024 / 1024).toFixed(1)}GB total
                  </span>
                </div>
                <progress
                  className={`progress ${getStorageUsage().percentage > 80 ? 'progress-warning' : 'progress-primary'} w-full mt-2`}
                  value={getStorageUsage().percentage}
                  max="100"
                ></progress>
              </div>
            </div>
          </div>

          {/* Active Features */}
          {currentTenant.features.length > 0 && (
            <div className="card bg-base-100 shadow-xl mb-6">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">Active Features</h3>
                <div className="flex flex-wrap gap-2">
                  {currentTenant.features.map((feature) => (
                    <div key={feature} className="badge badge-success badge-outline">
                      {feature.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tenant Users */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                Team Members ({tenantUsers.filter(u => u.tenantId === currentTenant.id).length})
              </h3>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <tbody>
                    {tenantUsers
                      .filter(user => user.tenantId === currentTenant.id)
                      .map((user) => (
                        <tr key={user.id} className="hover">
                          <td className="w-12">
                            <div className={`p-2 rounded-full ${user.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-base-200 text-base-content'}`}>
                              <UserIcon className="w-6 h-6" />
                            </div>
                          </td>
                          <td>
                            <div className="font-bold">{user.username}</div>
                            <div className="text-sm opacity-50">{user.email}</div>
                          </td>
                          <td className="text-right">
                            <div className={`badge ${user.role === 'owner' ? 'badge-primary' : 'badge-ghost'}`}>
                              {user.role}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </AnimatedBox>
    </MultiTenantContext.Provider>
  );
};

export default MultiTenantProvider;

// Export types for external use
export type { MultiTenantContextType };