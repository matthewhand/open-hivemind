/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import DataTable from '../../components/DaisyUI/DataTable';
import type { RDVColumn, RowAction } from '../../components/DaisyUI/DataTable';
import type { BackupRecord } from './types';

interface BackupsTabProps {
  backups: BackupRecord[];
  onRestoreBackup: (backupId: string) => void;
  onDeleteBackup: (backupId: string) => void;
}

const BackupsTab: React.FC<BackupsTabProps> = ({ backups, onRestoreBackup, onDeleteBackup }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Backup History</h3>

      <DataTable<BackupRecord>
        data={backups}
        columns={[
          {
            key: 'timestamp',
            title: 'Timestamp',
            prominent: true,
            sortable: true,
            render: (value: string) => new Date(value).toLocaleString(),
          },
          {
            key: 'type',
            title: 'Type',
            render: (value: string) => (
              <span className={`badge ${value === 'manual' ? 'badge-info' : 'badge-neutral'}`}>{value}</span>
            ),
          },
          { key: 'size', title: 'Size' },
          {
            key: 'status',
            title: 'Status',
            render: (value: string) => <span className="badge badge-success">{value}</span>,
          },
          { key: 'description', title: 'Description' },
        ] as RDVColumn<BackupRecord>[]}
        actions={[
          { label: 'Restore', variant: 'primary', onClick: (b) => onRestoreBackup(b.id) },
          { label: 'Delete', variant: 'error', onClick: (b) => onDeleteBackup(b.id) },
        ] as RowAction<BackupRecord>[]}
        rowKey={(b) => b.id}
      />
    </div>
  );
};

export default BackupsTab;
