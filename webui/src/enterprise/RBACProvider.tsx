import React, { createContext, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser, selectUserPermissions } from '../store/slices/authSlice';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel
} from '@mui/material';
import { 
  Security as SecurityIcon, 
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  SupervisedUserCircle as SupervisorIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { AnimatedBox } from '../animations/AnimationComponents';

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

export interface User {
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
  currentUser: User | null;
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
  users: User[];
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
  createUser: (userData: Partial<User>) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
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

const mockUsers: User[] = [
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
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [resources, setResources] = useState<Resource[]>(mockResources);
  
  // Calculate current user's roles and permissions
  const currentUserRoles = roles.filter(role => 
    currentUser?.roles.includes(role.id)
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
      return currentUser.role.includes(role);
    }
    
    return role.some(r => currentUser.role.includes(r));
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
  const createUser = async (userData: Partial<User>): Promise<User> => {
    if (!hasPermission('user.create')) {
      throw new Error('Insufficient permissions to create users');
    }
    
    const newUser: User = {
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

  const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
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
      admin: <AdminIcon />,
      developer: <EditIcon />,
      viewer: <ViewIcon />,
      'bot-manager': <SupervisorIcon />,
      'analytics-manager': <ViewIcon />,
    };
    return iconMap[role.id] || <PersonIcon />;
  };

  const getPermissionIcon = (permission: Permission): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      create: <AddIcon />,
      read: <ViewIcon />,
      update: <EditIcon />,
      delete: <DeleteIcon />,
      manage: <AdminIcon />,
      admin: <AdminIcon />,
    };
    return iconMap[permission.action] || <SecurityIcon />;
  };

  const getRoleColor = (role: Role): string => {
    const colorMap: Record<string, string> = {
      primary: '#1976d2',
      secondary: '#9c27b0',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
    };
    return colorMap[role.color] || '#757575';
  };

  const getPermissionColor = (permission: Permission): string => {
    const colorMap: Record<string, string> = {
      create: '#4caf50',
      read: '#2196f3',
      update: '#ff9800',
      delete: '#f44336',
      manage: '#9c27b0',
      admin: '#f44336',
    };
    return colorMap[permission.action] || '#757575';
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
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <SecurityIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Access Denied
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please log in to access the dashboard features.
            </Typography>
          </CardContent>
        </Card>
      </AnimatedBox>
    );
  }

  return (
    <RBACContext.Provider value={contextValue}>
      <AnimatedBox
        animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        sx={{ width: '100%' }}
      >
        {/* RBAC Header */}
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <SecurityIcon color="primary" />
                <Box>
                  <Typography variant="h6">
                    {currentUser.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentUser.email} • {currentUser.role}
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                {currentUserRoles.map((role) => (
                  <Chip
                    key={role.id}
                    label={role.name}
                    size="small"
                    color={role.color}
                  />
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Permissions Overview */}
        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={2} mb={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Permissions
              </Typography>
              <Typography variant="h4" color="primary.main">
                {currentUserPermissions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {permissions.length} total available
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Role Level
              </Typography>
              <Typography variant="h4" color="secondary.main">
                {Math.max(...currentUserRoles.map(r => r.level))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Highest role level
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Status
              </Typography>
              <Chip
                label={currentUser.isActive ? 'Active' : 'Inactive'}
                color={currentUser.isActive ? 'success' : 'error'}
                size="small"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {currentUser.lastLogin ? `Last login: ${new Date(currentUser.lastLogin).toLocaleDateString()}` : 'No login history'}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* User Permissions by Category */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your Permissions by Category
            </Typography>
            <List sx={{ p: 0 }}>
              {Object.entries(
                currentUserPermissions.reduce((acc, permission) => {
                  if (!acc[permission.category]) acc[permission.category] = [];
                  acc[permission.category].push(permission);
                  return acc;
                }, {} as Record<string, Permission[]>)
              ).map(([category, categoryPermissions]) => (
                <ListItem key={category} divider>
                  <ListItemIcon>
                    <SecurityIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={category}
                    secondary={
                      <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                        {categoryPermissions.map((permission) => (
                          <Chip
                            key={permission.id}
                            label={permission.name}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              borderColor: getPermissionColor(permission),
                              color: getPermissionColor(permission),
                            }}
                          />
                        ))}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* System Roles Overview (for users with admin access) */}
        {hasPermission('user.read') && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Roles ({roles.length})
              </Typography>
              <List sx={{ p: 0 }}>
                {roles.map((role) => (
                  <ListItem key={role.id} divider>
                    <ListItemIcon>
                      {getRoleIcon(role)}
                    </ListItemIcon>
                    <ListItemText
                      primary={role.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {role.description}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={1}>
                            <Chip
                              label={`Level ${role.level}`}
                              size="small"
                              variant="outlined"
                            />
                            {role.isSystem && (
                              <Chip
                                label="System"
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            <Chip
                              label={`${role.permissions.length} permissions`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                    />
                    <Chip
                      label={role.name}
                      color={role.color}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </AnimatedBox>
    </RBACContext.Provider>
  );
};

// Export types
export type { Permission, Role, User as RBACUser, Resource, RBACContextType };
export { RBACContext };

export default RBACProvider;