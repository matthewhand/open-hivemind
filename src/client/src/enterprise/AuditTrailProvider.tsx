import React, { createContext, useState, useContext } from 'react';
import { Card, Badge, Input } from '../components/DaisyUI';
import { ClipboardDocumentListIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  username: string;
  action: string;
  status: 'success' | 'failure' | 'warning';
}

interface AuditTrailContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const AuditTrailContext = createContext<AuditTrailContextType | undefined>(undefined);

const simpleEvents: AuditEvent[] = [
  { id: '1', timestamp: new Date(), username: 'admin', action: 'login', status: 'success' },
  { id: '2', timestamp: new Date(Date.now() - 3600000), username: 'dev', action: 'update_bot', status: 'success' },
  { id: '3', timestamp: new Date(Date.now() - 7200000), username: 'admin', action: 'delete_config', status: 'warning' },
];

interface AuditTrailProviderProps {
  children: React.ReactNode;
}

export const AuditTrailProvider: React.FC<AuditTrailProviderProps> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = simpleEvents.filter(event =>
    searchTerm === '' ||
    event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'failure': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <AuditTrailContext.Provider value={{ searchTerm, setSearchTerm }}>
      <div className="w-full space-y-4">
        <Card className="shadow-lg border-l-4 border-primary">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <ClipboardDocumentListIcon className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-lg font-bold">Audit Trail</h2>
                <p className="text-sm opacity-70">{simpleEvents.length} events</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="p-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 opacity-50" />
              <Input
                className="pl-9 text-sm"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="p-4">
            <h3 className="font-bold mb-3">Events ({filteredEvents.length})</h3>
            <div className="space-y-2">
              {filteredEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-2 border border-base-300 rounded">
                  <div className="flex-grow">
                    <p className="font-semibold text-sm">{event.action}</p>
                    <p className="text-xs opacity-70">
                      {event.username} • {event.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(event.status)} size="sm">{event.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      {children}
    </AuditTrailContext.Provider>
  );
};

export const useAuditTrail = () => {
  const context = useContext(AuditTrailContext);
  if (!context) throw new Error('useAuditTrail must be used within AuditTrailProvider');
  return context;
};

export default AuditTrailProvider;