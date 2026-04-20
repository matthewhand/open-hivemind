import React, { useState, useEffect } from 'react';
import Modal from '../DaisyUI/Modal';
import { LoadingSpinner } from '../DaisyUI/Loading';
import Timeline from '../DaisyUI/Timeline';
import Badge from '../DaisyUI/Badge';
import { Alert } from '../DaisyUI/Alert';
import { History, RotateCcw, Clock, Check } from 'lucide-react';
import { apiService } from '../../services/api';

interface Version {
  id: number;
  version: string;
  createdAt: string;
  changeLog?: string;
  createdBy?: string;
}

interface VersionHistoryModalProps {
  botId: string;
  botName: string;
  isOpen: boolean;
  onClose: () => void;
}

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ botId, botName, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiService.get(`/api/bots/${botId}/versions`);
      if (response.success && response.data?.versions) {
        setVersions(response.data.versions);
      } else {
        throw new Error(response.message || 'Failed to fetch versions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSuccessMsg(null);
      fetchVersions();
    }
  }, [isOpen, botId]);

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId);
    setError(null);
    setSuccessMsg(null);
    try {
      const response: any = await apiService.post(`/api/bots/${botId}/versions/${versionId}/restore`);
      if (response.success) {
        setSuccessMsg(`Successfully restored configuration to version ${versionId}.`);
        // Refresh versions to show the new current state
        await fetchVersions();
      } else {
        throw new Error(response.message || 'Failed to restore version');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRestoring(null);
      // Automatically close after success
      setTimeout(() => {
        if (!error) {
           onClose();
           window.location.reload(); // Refresh the app to catch the new bot config
        }
      }, 2000);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-2">
           <History className="w-5 h-5 text-primary" />
           <span>Version History: {botName}</span>
        </div>
      }
      size="md"
    >
      <div className="space-y-6">
        {error && <Alert status="error" message={error} />}
        {successMsg && (
          <Alert status="success" className="animate-in fade-in zoom-in-95" message={successMsg} />
        )}

        {loading ? (
          <div className="py-12 text-center">
             <LoadingSpinner lg />
             <p className="text-sm opacity-50 mt-4">Loading version timeline...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 bg-base-200/50 rounded-xl border border-dashed border-base-300">
             <Clock className="w-10 h-10 mx-auto opacity-20 mb-3" />
             <p className="opacity-50">No version history found for this bot.</p>
          </div>
        ) : (
          <div className="bg-base-200/20 p-4 rounded-xl max-h-[60vh] overflow-y-auto">
             <Timeline>
                {versions.map((v, index) => {
                  const isLatest = index === 0;
                  return (
                    <Timeline.Item 
                      key={v.version}
                      start={<div className="text-[10px] opacity-40 font-mono text-right w-16 leading-tight">{new Date(v.createdAt).toLocaleDateString()}<br/>{new Date(v.createdAt).toLocaleTimeString()}</div>}
                      middle={<div className={`p-1.5 rounded-full ${isLatest ? 'bg-primary text-primary-content ring-4 ring-primary/20' : 'bg-base-300 text-base-content/50'}`}>{isLatest ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}</div>}
                      end={
                        <div className={`p-4 rounded-xl border w-full mb-4 transition-all ${isLatest ? 'bg-base-100 border-primary/30 shadow-md' : 'bg-base-100/50 border-base-300 hover:border-base-content/20 hover:bg-base-100'}`}>
                           <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                 <Badge size="sm" variant={isLatest ? 'primary' : 'neutral'} className="font-mono">{v.version}</Badge>
                                 {isLatest && <Badge size="xs" variant="ghost" className="text-success uppercase tracking-widest text-[8px] font-bold">Current</Badge>}
                              </div>
                              {!isLatest && (
                                 <button 
                                   onClick={() => handleRestore(v.version)}
                                   disabled={restoring !== null}
                                   className={`btn btn-xs ${restoring === v.version ? 'btn-disabled loading' : 'btn-ghost hover:bg-primary/10 hover:text-primary'} gap-1`}
                                 >
                                    {restoring === v.version ? 'Restoring...' : <><RotateCcw className="w-3 h-3" /> Restore</>}
                                 </button>
                              )}
                           </div>
                           <p className="text-sm opacity-80">{v.changeLog || 'System update'}</p>
                           {v.createdBy && <p className="text-[10px] opacity-40 mt-2 flex items-center gap-1"><User className="w-3 h-3" /> {v.createdBy}</p>}
                        </div>
                      }
                    />
                  );
                })}
             </Timeline>
          </div>
        )}

        <div className="flex justify-end pt-2">
           <button onClick={onClose} className="btn btn-ghost">Close</button>
        </div>
      </div>
    </Modal>
  );
};

export default VersionHistoryModal;
