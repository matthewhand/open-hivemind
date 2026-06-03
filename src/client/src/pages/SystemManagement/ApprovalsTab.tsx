import React, { useState, useEffect } from 'react';
import List, { ListRow, ListColGrow, ListColWrap } from '../../components/DaisyUI/List';
import Collapse from '../../components/DaisyUI/Collapse';
import Button from '../../components/DaisyUI/Button';
import Badge from '../../components/DaisyUI/Badge';
import { ShieldCheck, Check, X, Clock, User, Info } from 'lucide-react';
import { Alert } from '../../components/DaisyUI/Alert';
import { LoadingSpinner } from '../../components/DaisyUI/Loading';

interface ApprovalRequest {
  id: string;
  type: 'config_change' | 'system_action' | 'user_access';
  requestedBy: string;
  description: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  details?: Record<string, any>;
}

const ApprovalsTab: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - will connect to real API later
    setTimeout(() => {
      setRequests([
        {
          id: '1',
          type: 'config_change',
          requestedBy: 'mhand',
          description: 'Update Slack bot token',
          createdAt: new Date().toISOString(),
          status: 'pending',
          details: { field: 'SLACK_BOT_TOKEN', reason: 'Token rotation' }
        },
        {
          id: '2',
          type: 'system_action',
          requestedBy: 'admin',
          description: 'Production database backup',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'pending'
        }
      ]);
      setLoading(false);
    }, 800);
  }, []);

  if (loading) return <div className="p-8 text-center"><LoadingSpinner lg /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Pending Approvals
        </h3>
        <Badge variant="primary">{requests.length} Requests</Badge>
      </div>

      {requests.length === 0 ? (
        <Alert status="info" message="No pending approval requests found." />
      ) : (
        <List className="bg-base-100 rounded-box border border-base-300 overflow-hidden">
          {requests.map(request => (
            <Collapse 
              key={request.id}
              title={
                <div className="flex items-center gap-4 w-full">
                  <div className="p-2 bg-base-200 rounded-lg">
                    <Clock className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{request.description}</div>
                    <div className="text-xs opacity-50 flex items-center gap-2">
                      <User className="w-3 h-3" /> {request.requestedBy} • {new Date(request.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge size="sm" variant="warning" className="mr-4">Pending</Badge>
                </div>
              }
              variant="arrow"
              className="border-b border-base-200 last:border-b-0"
            >
              <div className="p-4 bg-base-200/30 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold opacity-40">Request Type</span>
                      <p className="text-sm font-mono">{request.type}</p>
                   </div>
                   {request.details && Object.entries(request.details).map(([k, v]) => (
                     <div key={k} className="space-y-1">
                        <span className="text-[10px] uppercase font-bold opacity-40">{k}</span>
                        <p className="text-sm font-mono">{String(v)}</p>
                     </div>
                   ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="error" className="gap-2">
                    <X className="w-4 h-4" /> Deny
                  </Button>
                  <Button size="sm" variant="success" className="gap-2">
                    <Check className="w-4 h-4" /> Approve
                  </Button>
                </div>
              </div>
            </Collapse>
          ))}
        </List>
      )}
    </div>
  );
};

export default ApprovalsTab;
