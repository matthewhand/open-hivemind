import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Check, X, Clock, Terminal } from 'lucide-react';
import Card from './DaisyUI/Card';
import Button from './DaisyUI/Button';
import Badge from './DaisyUI/Badge';
import { apiService } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useErrorToast, useSuccessToast } from './DaisyUI/ToastNotification';

interface PendingAction {
  id: string;
  botName: string;
  toolName: string;
  args: Record<string, any>;
  timestamp: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

const PendingActions: React.FC = () => {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useWebSocket();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.get<any>('/api/admin/pending-actions');
      setActions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pending actions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();

    if (socket) {
      const handleCreated = (action: PendingAction) => {
        setActions(prev => [action, ...prev]);
        successToast('Approval Required', `Bot ${action.botName} wants to use ${action.toolName}`);
      };

      const handleResolved = ({ id, status }: { id: string, status: string }) => {
        setActions(prev => prev.filter(a => a.id !== id));
      };

      socket.on('pending_action_created', handleCreated);
      socket.on('pending_action_resolved', handleResolved);

      return () => {
        socket.off('pending_action_created', handleCreated);
        socket.off('pending_action_resolved', handleResolved);
      };
    }
  }, [socket, fetchActions, successToast]);

  const handleResolve = async (id: string, approved: boolean) => {
    try {
      const endpoint = `/api/admin/pending-actions/${id}/${approved ? 'approve' : 'deny'}`;
      await apiService.post(endpoint, {});
      setActions(prev => prev.filter(a => a.id !== id));
      successToast(approved ? 'Action Approved' : 'Action Denied', `The tool execution was ${approved ? 'allowed' : 'blocked'}.`);
    } catch (err) {
      errorToast('Error', 'Failed to resolve action');
    }
  };

  if (loading && actions.length === 0) return null;
  if (!loading && actions.length === 0) return null;

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 mb-3 px-4">
        <Shield className="w-5 h-5 text-warning" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60">Pending Approvals</h3>
        <Badge variant="warning" size="sm">{actions.length}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
        {actions.map((action) => (
          <Card key={action.id} className="bg-warning/5 border-warning/20 shadow-md">
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" size="xs">{action.botName}</Badge>
                    <span className="text-xs text-base-content/50 font-mono">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    {action.toolName}
                  </h4>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="xs" 
                    variant="success"
                    onClick={() => handleResolve(action.id, true)}
                    title="Approve"
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="xs" 
                    variant="error"
                    onClick={() => handleResolve(action.id, false)}
                    title="Deny"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="bg-base-300/50 rounded p-2 text-[10px] font-mono overflow-x-auto max-h-24">
                <pre>{JSON.stringify(action.args, null, 2)}</pre>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-base-content/40 italic">
                <Clock className="w-3 h-3" />
                Expires in 5 minutes
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="divider mx-4" />
    </div>
  );
};

export default PendingActions;
