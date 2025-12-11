import React, { createContext, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser, selectUserPermissions } from '../store/slices/authSlice';
import {
  ShieldCheckIcon,
  UserIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

// Import User type from authSlice to avoid conflict
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

export interface RBACUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  name: string;
  type: 'bot' | 'config' | 'dashboard' | 'analytics' | 'system' | 'user';
  ownerId?: string;
  tenantId?: string;
  isPublic: boolean;
  createdAt: string;
}

interface RBACContextType {
  currentUser: AuthUser | null;
  currentUserRoles: Role[];
  currentUserPermissions: Permission[];
  hasPermission: (permission: string | string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
  hasResourceAccess: (resourceId: string, action: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  roles: Role[];
  permissions: Permission[];
  users: RBACUser[];
  resources: Resource[];
  createRole: (roleData: Partial<Role>) => Promise<Role>;
  updateRole: (roleId: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  assignRoleToUser: (userId: string, roleId: string) => Promise<void>;
  removeRoleFromUser: (userId: string, roleId: string) => Promise<void>;
  createPermission: (permissionData: Partial<Permission>) => Promise<Permission>;
  updatePermission: (permissionId: string, updates: Partial<Permission>) => Promise<void>;
  deletePermission: (permissionId: string) => Promise<void>;
  createUser: (userData: Partial<RBACUser>) => Promise<RBACUser>;
  updateUser: (userId: string, updates: Partial<RBACUser>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  activateUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  createResource: (resourceData: Partial<Resource>) => Promise<Resource>;
  updateResource: (resourceId: string, updates: Partial<Resource>) => Promise<void>;
  deleteResource: (resourceId: string) => Promise<void>;
  checkResourceAccess: (userId: string, resourceId: string, action: string) => boolean;
  getRoleIcon: (role: Role) => React.ReactNode;
  getPermissionIcon: (permission: Permission) => React.ReactNode;
  getRoleColor: (role: Role) => string;
  getPermissionColor: (permission: Permission) => string;
  isSystemRole: (roleId: string) => boolean;
  canModifyRole: (roleId: string, userId: string) => boolean;
  canAssignRole: (roleId: string, userId: string) => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

interface RBACProviderProps {
  children: React.ReactNode;
}

export const RBACProvider: React.FC<RBACProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);
  const userPermissions = useAppSelector(selectUserPermissions);

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<RBACUser[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const currentUserRoles = roles.filter(role => currentUser?.role === role.id);

  const currentUserPermissionsList = permissions.filter(permission =>
    userPermissions.includes(permission.id) || userPermissions.includes('*')
  );

  const hasPermission = (permission: string | string[]): boolean => {
    if (!currentUser) return false;
    if (typeof permission === 'string') {
      return userPermissions.includes(permission) || userPermissions.includes('*');
    }
    return permission.some(p => userPermissions.includes(p) || userPermissions.includes('*'));
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!currentUser) return false;
    if (typeof role === 'string') return currentUser.role === role;
    return role.includes(currentUser.role);
  };

  const hasResourceAccess = (resourceId: string, action: string): boolean => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return false;
    if (resource.isPublic) return true;
    const permissionId = `${resource.type}.${action}`;
    return hasPermission(permissionId);
  };

  const hasAnyPermission = (permissions: string[]): boolean => permissions.some(p => hasPermission(p));
  const hasAllPermissions = (permissions: string[]): boolean => permissions.every(p => hasPermission(p));

  // Role Management
  const createRole = async (roleData: Partial<Role>): Promise<Role> => {
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
  const updateRole = async (roleId: string, updates: Partial<Role>) => {
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, ...updates } : r));
  };
  const deleteRole = async (roleId: string) => {
    setRoles(prev => prev.filter(r => r.id !== roleId));
  };
  const assignRoleToUser = async (userId: string, roleId: string) => {
    setUsers(prev => prev.map(u => u.id === userId && !u.roles.includes(roleId) ? { ...u, roles: [...u.roles, roleId] } : u));
  };
  const removeRoleFromUser = async (userId: string, roleId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: u.roles.filter(r => r !== roleId) } : u));
  };

  // Permission Management
  const createPermission = async (data: Partial<Permission>): Promise<Permission> => {
    const newPerm: Permission = {
      id: data.id || `perm-${Date.now()}`,
      name: data.name || 'Permission',
      resource: data.resource || 'system',
      action: data.action || 'read',
      description: data.description || '',
      category: data.category || 'Custom'
    };
    setPermissions(prev => [...prev, newPerm]);
    return newPerm;
  };
  const updatePermission = async (id: string, updates: Partial<Permission>) => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };
  const deletePermission = async (id: string) => {
    setPermissions(prev => prev.filter(p => p.id !== id));
  };

  // User Management
  const createUser = async (data: Partial<RBACUser>): Promise<RBACUser> => {
    const newUser: RBACUser = {
      id: `user-${Date.now()}`,
      username: data.username || 'User',
      email: data.email || '',
      roles: data.roles || [],
      permissions: data.permissions || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };
  const updateUser = async (id: string, updates: Partial<RBACUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };
  const deleteUser = async (id: string) => { setUsers(prev => prev.filter(u => u.id !== id)); };
  const activateUser = async (id: string) => updateUser(id, { isActive: true });
  const deactivateUser = async (id: string) => updateUser(id, { isActive: false });

  // Resource Management
  const createResource = async (data: Partial<Resource>): Promise<Resource> => {
    const res: Resource = {
      id: `res-${Date.now()}`,
      name: data.name || 'Resource',
      type: data.type || 'system',
      isPublic: data.isPublic || false,
      createdAt: new Date().toISOString(),
      ownerId: data.ownerId,
      tenantId: data.tenantId
    };
    setResources(prev => [...prev, res]);
    return res;
  };
  const updateResource = async (id: string, updates: Partial<Resource>) => {
    setResources(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };
  const deleteResource = async (id: string) => { setResources(prev => prev.filter(r => r.id !== id)); };
  const checkResourceAccess = (userId: string, resourceId: string, action: string) => { return hasResourceAccess(resourceId, action); };

  // UI Helpers
  const getRoleIcon = (role: Role) => <UserIcon className="w-5 h-5" />;
  const getPermissionIcon = (perm: Permission) => <EyeIcon className="w-4 h-4" />;
  const getRoleColor = (role: Role) => role.color || 'primary';
  const getPermissionColor = (perm: Permission) => 'primary';

  const isSystemRole = (id: string) => roles.find(r => r.id === id)?.isSystem || false;
  const canModifyRole = (roleId: string, userId: string) => true; // Simplified
  const canAssignRole = (roleId: string, userId: string) => true; // Simplified

  const contextValue: RBACContextType = {
    currentUser,
    currentUserRoles,
    currentUserPermissions: currentUserPermissionsList,
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

  // Render children immediately (do not block)
  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
};

export default RBACProvider;
export { RBACContext };