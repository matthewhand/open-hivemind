import React, { createContext, useState, useContext } from 'react';
import { Card, Badge, Button } from '../components/DaisyUI';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'pro' | 'enterprise';
}

interface MultiTenantContextType {
  currentTenant: Tenant | null;
  switchTenant: (tenantId: string) => void;
}

const MultiTenantContext = createContext<MultiTenantContextType | undefined>(undefined);

const simpleTenants: Tenant[] = [
  { id: 'tenant-1', name: 'Dev Workspace', domain: 'dev.hivemind.com', plan: 'enterprise' },
  { id: 'tenant-2', name: 'Production', domain: 'app.hivemind.com', plan: 'pro' },
];

interface MultiTenantProviderProps {
  children: React.ReactNode;
}

export const MultiTenantProvider: React.FC<MultiTenantProviderProps> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant>(simpleTenants[0]);

  const switchTenant = (tenantId: string): void => {
    const tenant = simpleTenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  };

  return (
    <MultiTenantContext.Provider value={{ currentTenant, switchTenant }}>
      <div className="w-full space-y-4">
        <Card className="shadow-lg border-l-4 border-primary">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BuildingOfficeIcon className="w-6 h-6 text-primary" />
                <div>
                  <h2 className="text-lg font-bold">Multi-Tenant</h2>
                  <p className="text-sm opacity-70">{currentTenant?.name}</p>
                </div>
              </div>
              <Badge variant="primary">{currentTenant?.plan}</Badge>
            </div>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="p-4">
            <h3 className="font-bold mb-3">Workspaces</h3>
            <div className="space-y-2">
              {simpleTenants.map(tenant => (
                <div key={tenant.id} className="flex items-center justify-between p-2 border border-base-300 rounded">
                  <div className="flex items-center gap-2">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    <div>
                      <p className="font-semibold text-sm">{tenant.name}</p>
                      <p className="text-xs opacity-70">{tenant.domain}</p>
                    </div>
                  </div>
                  {currentTenant?.id === tenant.id ? (
                    <Badge variant="success" size="sm">Active</Badge>
                  ) : (
                    <Button size="sm" onClick={() => switchTenant(tenant.id)}>Switch</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      {children}
    </MultiTenantContext.Provider>
  );
};

export const useMultiTenant = () => {
  const context = useContext(MultiTenantContext);
  if (!context) throw new Error('useMultiTenant must be used within MultiTenantProvider');
  return context;
};

export default MultiTenantProvider;