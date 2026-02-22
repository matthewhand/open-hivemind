import React, { createContext, useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setCurrentTenant as setReduxCurrentTenant } from '../store/slices/authSlice';
import { useAuth } from '../contexts/AuthContext';
import {
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
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
  createdAt: string;
  expiresAt?: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  lastLoginAt?: string;
  createdAt: string;
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

export const MultiTenantContext = createContext<MultiTenantContextType | undefined>(undefined);

interface MultiTenantProviderProps {
  children: React.ReactNode;
}

export const MultiTenantProvider: React.FC<MultiTenantProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();

  // State - MUST be declared before any conditional returns to follow React Hook rules
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);

  // Tenant management functions
  const switchTenant = async (tenantId: string): Promise<void> => {
    const tenant = availableTenants.find(t => t.id === tenantId);
    if (!tenant) { throw new Error('Tenant not found'); }
    if (!tenant.isActive) { throw new Error('Tenant is not active'); }
    if (tenant.expiresAt && new Date() > tenant.expiresAt) { throw new Error('Tenant subscription has expired'); }

    setCurrentTenant(tenant);
    dispatch(setReduxCurrentTenant(tenant));
    console.log(`Switched to tenant: ${tenant.name}`);
  };

  const createTenant = async (tenantData: Partial<Tenant>): Promise<Tenant> => {
    if (!tenantData.name || !tenantData.domain) { throw new Error('Tenant name and domain are required'); }
    const domainExists = availableTenants.some(t => t.domain === tenantData.domain);
    if (domainExists) { throw new Error('Domain already exists'); }

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: tenantData.name,
      domain: tenantData.domain,
      plan: tenantData.plan || 'enterprise', // Default to enterprise features for serverless
      maxBots: tenantData.maxBots || 10,
      maxUsers: tenantData.maxUsers || 5,
      storageQuota: tenantData.storageQuota || 1073741824, // 1GB default
      features: tenantData.features || ['multi-tenant', 'advanced-analytics', 'ai-insights'],
      isActive: true,
      createdAt: new Date().toISOString(),
      ...tenantData,
    };

    setAvailableTenants(prev => [...prev, newTenant]);
    return newTenant;
  };

  const updateTenant = async (tenantId: string, updates: Partial<Tenant>): Promise<void> => {
    const updatedTenants = availableTenants.map(tenant =>
      tenant.id === tenantId ? { ...tenant, ...updates } : tenant,
    );
    setAvailableTenants(updatedTenants);
    if (currentTenant?.id === tenantId) {
      setCurrentTenant(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteTenant = async (tenantId: string): Promise<void> => {
    if (currentTenant?.id === tenantId) { throw new Error('Cannot delete current tenant'); }
    setAvailableTenants(prev => prev.filter(t => t.id !== tenantId));
    setTenantUsers(prev => prev.filter(u => u.tenantId !== tenantId));
  };

  // User management functions
  const inviteUser = async (email: string, role: string): Promise<void> => {
    if (!currentTenant) { throw new Error('No tenant selected'); }
    const tenantUserCount = tenantUsers.filter(u => u.tenantId === currentTenant.id).length;
    if (tenantUserCount >= currentTenant.maxUsers) { throw new Error('Maximum user limit reached'); }

    const newUser: TenantUser = {
      id: `user-${Date.now()}`,
      tenantId: currentTenant.id,
      username: email.split('@')[0],
      email,
      role: role as TenantUser['role'],
      permissions: getRolePermissions(role),
      createdAt: new Date().toISOString(),
    };

    setTenantUsers(prev => [...prev, newUser]);
  };

  const removeUser = async (userId: string): Promise<void> => {
    const user = tenantUsers.find(u => u.id === userId);
    if (!user) { throw new Error('User not found'); }
    if (user.role === 'owner') { throw new Error('Cannot remove tenant owner'); }
    setTenantUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Auto-bootstrap default tenant if none exist
  React.useEffect(() => {
    if (isAuthenticated && availableTenants.length === 0) {
      const bootstrap = async () => {
        try {
          console.log('Bootstrapping default organization...');
          const newTenant = await createTenant({
            name: 'Primary Organization',
            domain: 'primary.local',
          });

          // Add current user as owner
          // Note: createTenant adds to availableTenants, but we need to ensure users are set
          const owner: TenantUser = {
            id: user?.id || `user-${Date.now()}`,
            tenantId: newTenant.id,
            username: user?.username || 'admin',
            email: user?.email || 'admin@local',
            role: 'owner',
            permissions: ['*'],
            createdAt: new Date().toISOString(),
          };
          setTenantUsers(prev => [...prev, owner]);

          setCurrentTenant(newTenant);
          dispatch(setReduxCurrentTenant(newTenant));
        } catch (err) {
          console.error('Failed to bootstrap org:', err);
        }
      };
      bootstrap();
    }
  }, [isAuthenticated, availableTenants.length, user, dispatch]);

  // Allow unauthenticated access (e.g. Login page)
  if (!isAuthenticated) { return <>{children}</>; }

  const updateUserRole = async (userId: string, newRole: string): Promise<void> => {
    const updatedUsers = tenantUsers.map(user =>
      user.id === userId ? { ...user, role: newRole as TenantUser['role'] } : user,
    );
    setTenantUsers(updatedUsers);
  };

  // Utility functions
  const canAccessFeature = (feature: string): boolean => {
    if (!currentTenant) { return false; }
    return currentTenant.features.includes(feature);
  };

  const getStorageUsage = () => {
    if (!currentTenant) { return { used: 0, total: 0, percentage: 0 }; }
    // Start empty for new tenants
    const used = 0;
    const percentage = 0;
    return { used, total: currentTenant.storageQuota, percentage };
  };

  const getBotUsage = () => {
    if (!currentTenant) { return { used: 0, total: 0, percentage: 0 }; }
    // Start empty
    const used = 0;
    const percentage = 0;
    return { used, total: currentTenant.maxBots, percentage };
  };

  const getUserUsage = () => {
    if (!currentTenant) { return { used: 0, total: 0, percentage: 0 }; }
    const used = tenantUsers.filter(u => u.tenantId === currentTenant.id).length;
    const percentage = (used / currentTenant.maxUsers) * 100;
    return { used, total: currentTenant.maxUsers, percentage };
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

  // Scenario 1: No Tenants Exist - Bootstrapping (Show Loading)
  if (availableTenants.length === 0) {
    return (
      <AnimatedBox animation="fade-in" duration={300}>
        <div className="min-h-screen flex items-center justify-center bg-base-200">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-base-content/70">Setting up your organization...</p>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  // Scenario 2: Tenant Exists but None Selected
  if (!currentTenant) {
    // Auto-select first available if user has access?
    // For now, show selection UI
    return (
      <AnimatedBox animation="fade-in" duration={300}>
        <div className="p-6 flex justify-center items-center min-h-[400px]">
          <div className="card bg-base-100 shadow-xl max-w-sm text-center">
            <div className="card-body items-center">
              <BuildingOfficeIcon className="w-16 h-16 text-primary mb-4" />
              <h2 className="card-title text-2xl mb-2">Select Organization</h2>
              <div className="flex flex-col gap-2 w-full mt-4">
                {availableTenants.map(t => (
                  <button
                    key={t.id}
                    className="btn btn-outline"
                    onClick={() => switchTenant(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  // Check user access
  const currentUser = tenantUsers.find(u => u.tenantId === currentTenant.id && u.username === (user?.username || 'admin'));
  // Note: Simple matching by username for serverless demo simplicity. Ideally match by ID.
  // Since we just created the user with user.id, we should find match by ID ideally.
  const currentUserById = tenantUsers.find(u => u.tenantId === currentTenant.id && u.id === user?.id);

  if (!currentUserById && !currentUser) {
    // Fallback: If current user is 'admin' (serverless default), maybe allow access?
    // But we just added them to tenantUsers on creation.
    return (
      <AnimatedBox animation="fade-in" duration={300}>
        <div className="p-6">
          <div className="alert alert-error shadow-lg mb-4">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <div><h3 className="font-bold">Access Denied</h3></div>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <MultiTenantContext.Provider value={contextValue}>
      {children}
    </MultiTenantContext.Provider>
  );
};

export default MultiTenantProvider;

export type { MultiTenantContextType };