import React, { createContext, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser, selectUserPermissions } from '../store/slices/authSlice';
import {
  ShieldCheckIcon,
  UserIcon,
  UserGroupIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { AnimatedBox } from '../animations/AnimationComponents';

// Import User type from authSlice to avoid conflicts
import type { User as AuthUser } from '../store/slices/authSlice';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage' | 'admin';
  description: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  level: number;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

// Renamed to RBACUser to avoid conflict with AuthUser
export interface RBACUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resource {
  id: string;
  name: string;
  type: 'bot' | 'config' | 'dashboard' | 'analytics' | 'system' | 'user';
  ownerId?: string;
  tenantId?: string;
  isPublic: boolean;
  createdAt: Date;
}

interface RBACContextType {
  // Current user context
  currentUser: AuthUser | null;
  currentUserRoles: Role[];
  currentUserPermissions: Permission[];

  // Permission checking
  hasPermission: (permission: string | string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
  hasResourceAccess: (resourceId: string, action: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;

  // Role management
  roles: Role[];
  permissions: Permission[];
  users: RBACUser[];
  resources: Resource[];

  // CRUD operations
  createRole: (roleData: Partial<Role>) => Promise<Role>;
  updateRole: (roleId: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  assignRoleToUser: (userId: string, roleId: string) => Promise<void>;
  removeRoleFromUser: (userId: string, roleId: string) => Promise<void>;

  // Permission management
  createPermission: (permissionData: Partial<Permission>) => Promise<Permission>;
  updatePermission: (permissionId: string, updates: Partial<Permission>) => Promise<void>;
  deletePermission: (permissionId: string) => Promise<void>;

  // User management
  createUser: (userData: Partial<RBACUser>) => Promise<RBACUser>;
  updateUser: (userId: string, updates: Partial<RBACUser>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  activateUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;

  // Resource management
  createResource: (resourceData: Partial<Resource>) => Promise<Resource>;
  updateResource: (resourceId: string, updates: Partial<Resource>) => Promise<void>;
  deleteResource: (resourceId: string) => Promise<void>;
  checkResourceAccess: (userId: string, resourceId: string, action: string) => boolean;

  // UI helpers
  getRoleIcon: (role: Role) => React.ReactNode;
  getPermissionIcon: (permission: Permission) => React.ReactNode;
  getRoleColor: (role: Role) => string;
  getPermissionColor: (permission: Permission) => string;

  // Security checks
  isSystemRole: (roleId: string) => boolean;
  canModifyRole: (roleId: string, userId: string) => boolean;
  canAssignRole: (roleId: string, userId: string) => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

// Mock data for demonstration
const mockPermissions: Permission[] = [
  // Bot Management
  { id: 'bot.create', name: 'Create Bot', resource: 'bot', action: 'create', description: 'Create new bot instances', category: 'Bot Management' },
  { id: 'bot.read', name: 'View Bot', resource: 'bot', action: 'read', description: 'View bot configurations and status', category: 'Bot Management' },
  { id: 'bot.update', name: 'Update Bot', resource: 'bot', action: 'update', description: 'Modify bot configurations', category: 'Bot Management' },
  { id: 'bot.delete', name: 'Delete Bot', resource: 'bot', action: 'delete', description: 'Delete bot instances', category: 'Bot Management' },
  { id: 'bot.manage', name: 'Manage Bot', resource: 'bot', action: 'manage', description: 'Full bot management access', category: 'Bot Management' },

  // Configuration
  { id: 'config.create', name: 'Create Config', resource: 'config', action: 'create', description: 'Create new configurations', category: 'Configuration' },
  { id: 'config.read', name: 'View Config', resource: 'config', action: 'read', description: 'View configuration settings', category: 'Configuration' },
  { id: 'config.update', name: 'Update Config', resource: 'config', action: 'update', description: 'Modify configuration settings', category: 'Configuration' },
  { id: 'config.delete', name: 'Delete Config', resource: 'config', action: 'delete', description: 'Delete configurations', category: 'Configuration' },

  // Dashboard
  { id: 'dashboard.read', name: 'Access Dashboard', resource: 'dashboard', action: 'read', description: 'Access dashboard views', category: 'Dashboard' },
  { id: 'dashboard.manage', name: 'Manage Dashboard', resource: 'dashboard', action: 'manage', description: 'Manage dashboard layouts and widgets', category: 'Dashboard' },

  // Analytics
  { id: 'analytics.read', name: 'View Analytics', resource: 'analytics', action: 'read', description: 'View analytics and reports', category: 'Analytics' },
  { id: 'analytics.manage', name: 'Manage Analytics', resource: 'analytics', action: 'manage', description: 'Configure analytics settings', category: 'Analytics' },

  // System
  { id: 'system.read', name: 'View System', resource: 'system', action: 'read', description: 'View system information', category: 'System' },
  { id: 'system.manage', name: 'Manage System', resource: 'system', action: 'manage', description: 'Manage system settings', category: 'System' },
  { id: 'system.admin', name: 'System Admin', resource: 'system', action: 'admin', description: 'Full system administration access', category: 'System' },

  // User Management
  { id: 'user.create', name: 'Create User', resource: 'user', action: 'create', description: 'Create new user accounts', category: 'User Management' },
  { id: 'user.read', name: 'View User', resource: 'user', action: 'read', description: 'View user information', category: 'User Management' },
  { id: 'user.update', name: 'Update User', resource: 'user', action: 'update', description: 'Update user information', category: 'User Management' },
  { id: 'user.delete', name: 'Delete User', resource: 'user', action: 'delete', description: 'Delete user accounts', category: 'User Management' },
  { id: 'user.manage', name: 'Manage Users', resource: 'user', action: 'manage', description: 'Full user management access', category: 'User Management' },
];

const mockRoles: Role[] = [
  {
    id: 'admin',
    name: 'System Administrator',
    description: 'Full system access with all permissions',
    permissions: ['*'],
    isSystem: true,
    level: 100,
    color: 'error',
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Development team with bot and configuration access',
    permissions: ['bot.*', 'config.*', 'dashboard.*', 'analytics.*', 'system.read'],
    isSystem: true,
    level: 80,
    color: 'primary',
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to dashboards and analytics',
    permissions: ['dashboard.read', 'analytics.read', 'config.read', 'bot.read'],
    isSystem: true,
    level: 20,
    color: 'info',
  },
  {
    id: 'bot-manager',
    name: 'Bot Manager',
    description: 'Bot management with limited configuration access',
    permissions: ['bot.*', 'config.read', 'dashboard.read', 'analytics.read'],
    isSystem: false,
    level: 60,
    color: 'success',
  },
  {
    id: 'analytics-manager',
    name: 'Analytics Manager',
    description: 'Analytics and reporting access',
    permissions: ['analytics.*', 'dashboard.read', 'config.read'],
    isSystem: false,
    level: 40,
    color: 'secondary',
  },
];

const mockUsers: RBACUser[] = [
  {
    id: 'user-001',
    username: 'admin',
    email: 'admin@open-hivemind.com',
    roles: ['admin'],
    permissions: ['*'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-002',
    username: 'developer',
    email: 'dev@open-hivemind.com',
    roles: ['developer'],
    permissions: ['bot.*', 'config.*', 'dashboard.*', 'analytics.*', 'system.read'],
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'user-003',
    username: 'viewer',
    email: 'viewer@open-hivemind.com',
    roles: ['viewer'],
    permissions: ['dashboard.read', 'analytics.read', 'config.read', 'bot.read'],
    isActive: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'user-004',
    username: 'bot-manager',
    email: 'botmgr@open-hivemind.com',
    roles: ['bot-manager'],
    permissions: ['bot.*', 'config.read', 'dashboard.read', 'analytics.read'],
    isActive: true,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
  },
];

const mockResources: Resource[] = [
  {
    id: 'resource-001',
    name: 'Main Dashboard',
    type: 'dashboard',
    isPublic: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'resource-002',
    name: 'Bot Manager Dashboard',
    type: 'dashboard',
    isPublic: false,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'resource-003',
    name: 'Analytics Dashboard',
    type: 'dashboard',
    isPublic: false,
    createdAt: new Date('2024-03-01'),
  },
];

interface RBACProviderProps {
  children: React.ReactNode;
}

export const RBACProvider: React.FC<RBACProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);
  const userPermissions = useAppSelector(selectUserPermissions);

  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [permissions, setPermissions] = useState<Permission[]>(mockPermissions);
  const [users, setUsers] = useState<RBACUser[]>(mockUsers);
  const [resources, setResources] = useState<Resource[]>(mockResources);

  // Calculate current user's roles and permissions
  // Note: AuthUser has single 'role' string, but RBAC system supports multiple roles.
  // We map the single AuthUser role to our Role definitions.
  const currentUserRoles = roles.filter(role =>
    currentUser?.role === role.id
  );

  const currentUserPermissions = permissions.filter(permission =>
    hasPermission(permission.id)
  );

  // Permission checking functions
  const hasPermission = (permission: string | string[]): boolean => {
    if (!currentUser) return false;

    if (typeof permission === 'string') {
      return userPermissions.includes(permission) || userPermissions.includes('*');
    }

    return permission.some(p => userPermissions.includes(p) || userPermissions.includes('*'));
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!currentUser) return false;

    if (typeof role === 'string') {
      return currentUser.role === role;
    }

    return role.includes(currentUser.role);
  };

  const hasResourceAccess = (resourceId: string, action: string): boolean => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return false;

    // Check if resource is public
    if (resource.isPublic) return true;

    // Check if user has specific permission for this resource type
    const permissionId = `${resource.type}.${action}`;
    return hasPermission(permissionId);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  // Role management functions
  const createRole = async (roleData: Partial<Role>): Promise<Role> => {
    if (!hasPermission('user.manage')) {
      throw new Error('Insufficient permissions to create roles');
    }

    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: roleData.name || 'New Role',
      description: roleData.description || '',
      permissions: roleData.permissions || [],
      isSystem: false,
      level: roleData.level || 50,
      color: roleData.color || 'primary',
    };

    setRoles(prev => [...prev, newRole]);
    return newRole;
  };

  const updateRole = async (roleId: string, updates: Partial<Role>): Promise<void> => {
    if (!hasPermission('user.manage')) {
      throw new Error('Insufficient permissions to update roles');
    }

    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) {
      throw new Error('Cannot modify system roles');
    }

    setRoles(prev => prev.map(role =>
      role.id === roleId ? { ...role, ...updates } : role
    ));
  };

  const deleteRole = async (roleId: string): Promise<void> => {
    if (!hasPermission('user.manage')) {
      throw new Error('Insufficient permissions to delete roles');
    }

    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    setRoles(prev => prev.filter(role => role.id !== roleId));
  };

  const assignRoleToUser = async (userId: string, roleId: string): Promise<void> => {
    if (!hasPermission('user.update')) {
      throw new Error('Insufficient permissions to assign roles');
    }

    setUsers(prev => prev.map(user =>
      user.id === userId && !user.roles.includes(roleId)
        ? { ...user, roles: [...user.roles, roleId] }
        : user
    ));
  };

  const removeRoleFromUser = async (userId: string, roleId: string): Promise<void> => {
    if (!hasPermission('user.update')) {
      throw new Error('Insufficient permissions to remove roles');
    }

    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, roles: user.roles.filter(r => r !== roleId) }
        : user
    ));
  };

  // Permission management functions
  const createPermission = async (permissionData: Partial<Permission>): Promise<Permission> => {
    if (!hasPermission('system.admin')) {
      throw new Error('Insufficient permissions to create permissions');
    }

    const newPermission: Permission = {
      id: permissionData.id || `permission-${Date.now()}`,
      name: permissionData.name || 'New Permission',
      resource: permissionData.resource || 'system',
      action: permissionData.action || 'read',
      description: permissionData.description || '',
      category: permissionData.category || 'System',
    };

    setPermissions(prev => [...prev, newPermission]);
    return newPermission;
  };

  const updatePermission = async (permissionId: string, updates: Partial<Permission>): Promise<void> => {
    if (!hasPermission('system.admin')) {
      throw new Error('Insufficient permissions to update permissions');
    }

    setPermissions(prev => prev.map(permission =>
      permission.id === permissionId ? { ...permission, ...updates } : permission
    ));
  };

  const deletePermission = async (permissionId: string): Promise<void> => {
    if (!hasPermission('system.admin')) {
      throw new Error('Insufficient permissions to delete permissions');
    }

    setPermissions(prev => prev.filter(permission => permission.id !== permissionId));
  };

  // User management functions
  const createUser = async (userData: Partial<RBACUser>): Promise<RBACUser> => {
    if (!hasPermission('user.create')) {
      throw new Error('Insufficient permissions to create users');
    }

    const newUser: RBACUser = {
      id: `user-${Date.now()}`,
      username: userData.username || 'New User',
      email: userData.email || '',
      roles: userData.roles || ['viewer'],
      permissions: userData.permissions || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = async (userId: string, updates: Partial<RBACUser>): Promise<void> => {
    if (!hasPermission('user.update')) {
      throw new Error('Insufficient permissions to update users');
    }

    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, ...updates, updatedAt: new Date() } : user
    ));
  };

  const deleteUser = async (userId: string): Promise<void> => {
    if (!hasPermission('user.delete')) {
      throw new Error('Insufficient permissions to delete users');
    }

    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  const activateUser = async (userId: string): Promise<void> => {
    if (!hasPermission('user.update')) {
      throw new Error('Insufficient permissions to activate users');
    }

    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, isActive: true, updatedAt: new Date() } : user
    ));
  };

  const deactivateUser = async (userId: string): Promise<void> => {
    if (!hasPermission('user.update')) {
      throw new Error('Insufficient permissions to deactivate users');
    }

    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, isActive: false, updatedAt: new Date() } : user
    ));
  };

  // Resource management functions
  const createResource = async (resourceData: Partial<Resource>): Promise<Resource> => {
    const newResource: Resource = {
      id: `resource-${Date.now()}`,
      name: resourceData.name || 'New Resource',
      type: resourceData.type || 'system',
      isPublic: resourceData.isPublic || false,
      createdAt: new Date(),
      ownerId: resourceData.ownerId,
      tenantId: resourceData.tenantId,
    };

    setResources(prev => [...prev, newResource]);
    return newResource;
  };

  const updateResource = async (resourceId: string, updates: Partial<Resource>): Promise<void> => {
    setResources(prev => prev.map(resource =>
      resource.id === resourceId ? { ...resource, ...updates } : resource
    ));
  };

  const deleteResource = async (resourceId: string): Promise<void> => {
    setResources(prev => prev.filter(resource => resource.id !== resourceId));
  };

  const checkResourceAccess = (userId: string, resourceId: string, action: string): boolean => {
    const user = users.find(u => u.id === userId);
    if (!user) return false;

    return hasResourceAccess(resourceId, action);
  };

  // UI helper functions
  const getRoleIcon = (role: Role): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      admin: <ShieldCheckIcon className="w-5 h-5" />,
      developer: <PencilIcon className="w-5 h-5" />,
      viewer: <EyeIcon className="w-5 h-5" />,
      'bot-manager': <UserGroupIcon className="w-5 h-5" />,
      'analytics-manager': <EyeIcon className="w-5 h-5" />,
    };
    return iconMap[role.id] || <UserIcon className="w-5 h-5" />;
  };

  const getPermissionIcon = (permission: Permission): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      create: <PlusIcon className="w-4 h-4" />,
      read: <EyeIcon className="w-4 h-4" />,
      update: <PencilIcon className="w-4 h-4" />,
      delete: <TrashIcon className="w-4 h-4" />,
      manage: <ShieldCheckIcon className="w-4 h-4" />,
      admin: <ShieldCheckIcon className="w-4 h-4" />,
    };
    return iconMap[permission.action] || <LockClosedIcon className="w-4 h-4" />;
  };

  const getRoleColor = (role: Role): string => {
    const colorMap: Record<string, string> = {
      primary: 'primary',
      secondary: 'secondary',
      success: 'success',
      warning: 'warning',
      error: 'error',
      info: 'info',
    };
    return colorMap[role.color] || 'neutral';
  };

  const getPermissionColor = (permission: Permission): string => {
    const colorMap: Record<string, string> = {
      create: 'success',
      read: 'info',
      update: 'warning',
      delete: 'error',
      manage: 'secondary',
      admin: 'error',
    };
    return colorMap[permission.action] || 'neutral';
  };

  // Security check functions
  const isSystemRole = (roleId: string): boolean => {
    const role = roles.find(r => r.id === roleId);
    return role?.isSystem || false;
  };

  const canModifyRole = (roleId: string, userId: string): boolean => {
    if (!hasPermission('user.manage')) return false;

    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) return false;

    const user = users.find(u => u.id === userId);
    if (!user) return false;

    // Users can only modify roles with lower or equal level
    const userHighestRole = Math.max(...user.roles.map(rId =>
      roles.find(r => r.id === rId)?.level || 0
    ));

    const targetRoleLevel = role?.level || 0;
    return userHighestRole >= targetRoleLevel;
  };

  const canAssignRole = (roleId: string, userId: string): boolean => {
    if (!hasPermission('user.update')) return false;

    const role = roles.find(r => r.id === roleId);
    if (!role) return false;

    const user = users.find(u => u.id === userId);
    if (!user) return false;

    // Users can only assign roles with lower or equal level
    const userHighestRole = Math.max(...user.roles.map(rId =>
      roles.find(r => r.id === rId)?.level || 0
    ));

    return userHighestRole >= role.level;
  };

  const contextValue: RBACContextType = {
    currentUser,
    currentUserRoles,
    currentUserPermissions,
    hasPermission,
    hasRole,
    hasResourceAccess,
    hasAnyPermission,
    hasAllPermissions,
    roles,
    permissions,
    users,
    resources,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
    removeRoleFromUser,
    createPermission,
    updatePermission,
    deletePermission,
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
    createResource,
    updateResource,
    deleteResource,
    checkResourceAccess,
    getRoleIcon,
    getPermissionIcon,
    getRoleColor,
    getPermissionColor,
    isSystemRole,
    canModifyRole,
    canAssignRole,
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation="fade-in"
        duration={300}
      >
        <div className="p-6 flex justify-center items-center min-h-[400px]">
          <div className="card bg-base-100 shadow-xl max-w-sm text-center">
            <div className="card-body items-center">
              <ShieldCheckIcon className="w-16 h-16 text-warning mb-4" />
              <h2 className="card-title text-2xl mb-2">Access Denied</h2>
              <p className="text-base-content/70">
                Please log in to access the dashboard features.
              </p>
            </div>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <RBACContext.Provider value={contextValue}>
      <AnimatedBox
        animation="fade-in"
        duration={300}
      >
        <div className="w-full">
          {/* RBAC Header */}
          <div className="card bg-base-100 shadow-xl mb-6 border-l-4 border-primary">
            <div className="card-body">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <ShieldCheckIcon className="w-8 h-8 text-primary" />
                  <div>
                    <h2 className="card-title text-xl">
                      {currentUser.username}
                    </h2>
                    <p className="text-sm text-base-content/70">
                      {currentUser.email} • {currentUser.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {currentUserRoles.map((role) => (
                    <div
                      key={role.id}
                      className={`badge badge-${getRoleColor(role)} gap-1`}
                    >
                      {getRoleIcon(role)}
                      {role.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Total Permissions</h3>
                <div className="text-3xl font-bold text-primary">
                  {currentUserPermissions.length}
                </div>
                <div className="text-sm text-base-content/70">
                  {permissions.length} total available
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Role Level</h3>
                <div className="text-3xl font-bold text-secondary">
                  {Math.max(...currentUserRoles.map(r => r.level))}
                </div>
                <div className="text-sm text-base-content/70">
                  Highest role level
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Account Status</h3>
                <div className="badge badge-success gap-2">
                  <CheckCircleIcon className="w-4 h-4" />
                  Active
                </div>
                <div className="text-sm text-base-content/70 mt-2">
                  {currentUser.lastLogin ? `Last login: ${new Date(currentUser.lastLogin).toLocaleDateString()}` : 'No login history'}
                </div>
              </div>
            </div>
          </div>

          {/* User Permissions by Category */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                Your Permissions by Category
              </h3>
              <div className="divide-y divide-base-200">
                {Object.entries(
                  currentUserPermissions.reduce((acc, permission) => {
                    if (!acc[permission.category]) acc[permission.category] = [];
                    acc[permission.category].push(permission);
                    return acc;
                  }, {} as Record<string, Permission[]>)
                ).map(([category, categoryPermissions]) => (
                  <div key={category} className="py-4">
                    <h4 className="font-bold mb-2">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {categoryPermissions.map((permission) => (
                        <div
                          key={permission.id}
                          className={`badge badge-${getPermissionColor(permission)} badge-outline gap-1`}
                          title={permission.description}
                        >
                          {getPermissionIcon(permission)}
                          {permission.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AnimatedBox>
    </RBACContext.Provider>
  );
};

export default RBACProvider;

// Export types for external use
export type { RBACContextType };