import React, { useState, useEffect } from 'react';
import List, { ListRow, ListColGrow, ListColWrap } from '../../components/DaisyUI/List';
import Button from '../../components/DaisyUI/Button';
import Badge from '../../components/DaisyUI/Badge';
import { Search, History, Filter, Download, User, Activity, AlertCircle } from 'lucide-react';
import Input from '../../components/DaisyUI/Input';
import { LoadingSpinner } from '../../components/DaisyUI/Loading';

interface AuditLog {
  id: string;
  action: string;
  user: string;
  resource: string;
  timestamp: string;
  status: 'success' | 'failure';
  ip?: string;
}

const AuditTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchBase] = useState('');

  useEffect(() => {
    // Mock data
    setTimeout(() => {
      setLogs([
        { id: 'a1', action: 'LOGIN', user: 'mhand', resource: 'Auth', timestamp: new Date().toISOString(), status: 'success', ip: '192.168.1.1' },
        { id: 'a2', action: 'CREATE_BOT', user: 'admin', resource: 'Bot-Alpha', timestamp: new Date(Date.now() - 500000).toISOString(), status: 'success' },
        { id: 'a3', action: 'UPDATE_CONFIG', user: 'mhand', resource: 'Global', timestamp: new Date(Date.now() - 1200000).toISOString(), status: 'success' },
        { id: 'a4', action: 'FAILED_LOGIN', user: 'unknown', resource: 'Auth', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'failure', ip: '10.0.0.5' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) return <div className="p-8 text-center"><LoadingSpinner lg /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> System Audit Trail
        </h3>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <Input 
              size="sm" 
              placeholder="Search logs..." 
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchBase(e.target.value)}
            />
          </div>
          <Button size="sm" variant="ghost" className="btn-square"><Filter className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" className="btn-square"><Download className="w-4 h-4" /></Button>
        </div>
      </div>

      <List className="bg-base-100 rounded-box border border-base-300 overflow-hidden">
        {logs.map(log => (
          <ListRow key={log.id} className="hover:bg-base-200/50 transition-colors p-3 border-b border-base-200 last:border-b-0">
            <div className={`p-2 rounded-lg ${log.status === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
               {log.status === 'success' ? <Activity className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>

            <ListColGrow>
               <div className="flex items-center gap-2">
                  <span className="font-bold text-sm font-mono">{log.action}</span>
                  <Badge size="xs" variant={log.status === 'success' ? 'success' : 'error'}>{log.status}</Badge>
               </div>
               <div className="text-xs opacity-50 flex items-center gap-4">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {log.user}</span>
                  <span>Resource: {log.resource}</span>
                  {log.ip && <span>IP: {log.ip}</span>}
               </div>
            </ListColGrow>

            <ListColWrap className="text-right">
               <div className="text-xs font-mono opacity-60">
                  {new Date(log.timestamp).toLocaleTimeString()}
               </div>
               <div className="text-[10px] opacity-40">
                  {new Date(log.timestamp).toLocaleDateString()}
               </div>
            </ListColWrap>
          </ListRow>
        ))}
      </List>

      <div className="text-center pb-4">
         <Button variant="ghost" size="sm" className="opacity-50 hover:opacity-100">Load More History</Button>
      </div>
    </div>
  );
};

export default AuditTab;
