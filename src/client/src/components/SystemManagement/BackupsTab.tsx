import React from 'react';
import { BackupRecord } from './types';
import { Card, Badge, Button, Table } from '../DaisyUI';
import { Download, Trash2, RotateCcw, FileText, Database } from 'lucide-react';

interface BackupsTabProps {
  backups: BackupRecord[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

const BackupsTab: React.FC<BackupsTabProps> = ({ backups, onRestore, onDelete }) => {
  return (
    <Card className="bg-base-100 shadow-sm border border-base-200">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 opacity-70"/>
            <h3 className="text-lg font-bold">Backup History</h3>
        </div>

        <div className="overflow-x-auto">
          <Table className="table w-full">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-base-200/50">
                  <td className="font-mono text-sm">{new Date(backup.timestamp).toLocaleString()}</td>
                  <td>
                    <Badge variant={backup.type === 'manual' ? 'info' : 'neutral'} size="small">
                      {backup.type}
                    </Badge>
                  </td>
                  <td className="font-mono text-sm">{backup.size}</td>
                  <td>
                    <Badge variant={backup.status === 'success' ? 'success' : 'error'} size="small">
                      {backup.status}
                    </Badge>
                  </td>
                  <td className="text-sm max-w-xs truncate" title={backup.description}>
                      {backup.description}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onRestore(backup.id)}
                        title="Restore"
                        className="tooltip tooltip-left"
                        data-tip="Restore"
                      >
                        <RotateCcw className="w-4 h-4 text-primary" />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onDelete(backup.id)}
                        title="Delete"
                        className="tooltip tooltip-left"
                        data-tip="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-error" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                  <tr>
                      <td colSpan={6} className="text-center py-8 text-base-content/50">
                          No backups found. Create one manually or wait for auto-backup.
                      </td>
                  </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </Card>
  );
};

export default BackupsTab;
