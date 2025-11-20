import React, { createContext, useState, useContext } from 'react';
import { Card, Badge } from '../components/DaisyUI';
import { ShieldCheckIcon, KeyIcon, UserGroupIcon } from '@heroicons/react/24/outline';

export interface Role {
  id: string;
  name: string;
  description: string;
}

interface RBACContextType {
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

const simpleRoles: Role[] = [
  { id: 'admin', name: 'Administrator', description: 'Full system access' },
  { id: 'developer', name: 'Developer', description: 'Bot management access' },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access' },
];

const simplePermissions = [
  { id: 'bot.create', name: 'Create Bot', category: 'Bot Management' },
  { id: 'bot.read', name: 'View Bot', category: 'Bot Management' },
  { id: 'config.update', name: 'Update Config', category: 'Configuration' },
  { id: 'dashboard.read', name: 'Access Dashboard', category: 'Dashboard' },
];

interface RBACProviderProps {
  children: React.ReactNode;
}

export const RBACProvider: React.FC<RBACProviderProps> = ({ children }) => {
  const [currentRole] = useState<string>('admin');

  const hasPermission = (permission: string): boolean => {
    return currentRole === 'admin';
  };

  const hasRole = (roleId: string): boolean => {
    return currentRole === roleId;
  };

  return (
    <RBACContext.Provider value={{ hasPermission, hasRole }}>
      <div className="w-full space-y-4">
        <Card className="shadow-lg border-l-4 border-primary">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-lg font-bold">RBAC</h2>
                <p className="text-sm opacity-70">Role-based access control</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="p-4">
            <h3 className="font-bold mb-3">Current Role</h3>
            <div className="flex flex-wrap gap-2">
              {simpleRoles.filter(role => role.id === currentRole).map(role => (
                <Badge key={role.id} variant="primary">
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="p-4">
            <h3 className="font-bold mb-3">Available Roles</h3>
            <div className="space-y-2">
              {simpleRoles.map(role => (
                <div key={role.id} className="flex items-center justify-between p-2 border border-base-300 rounded">
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4" />
                    <div>
                      <p className="font-semibold text-sm">{role.name}</p>
                      <p className="text-xs opacity-70">{role.description}</p>
                    </div>
                  </div>
                  {currentRole === role.id && (
                    <Badge variant="success" size="sm">Active</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="p-4">
            <h3 className="font-bold mb-3">Permissions</h3>
            <div className="grid grid-cols-1 gap-2">
              {simplePermissions.map(perm => (
                <div key={perm.id} className="flex items-center gap-2 p-2 border border-base-300 rounded">
                  <KeyIcon className="w-4 h-4 opacity-50" />
                  <div className="flex-grow">
                    <p className="font-semibold text-sm">{perm.name}</p>
                    <p className="text-xs opacity-70">{perm.category}</p>
                  </div>
                  <Badge variant={hasPermission(perm.id) ? 'success' : 'neutral'} size="sm">
                    {hasPermission(perm.id) ? '✓' : '✗'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) throw new Error('useRBAC must be used within RBACProvider');
  return context;
};

export default RBACProvider;