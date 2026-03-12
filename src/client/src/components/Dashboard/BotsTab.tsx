import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Card from '../DaisyUI/Card';
import { Button } from '../DaisyUI/Button';
import DataTable from '../DaisyUI/DataTable';
import EmptyState from '../DaisyUI/EmptyState';
import { getBotColumns } from './utils/getBotColumns';

interface BotsTabProps {
  bots: any[];
  botTableData: any[];
  selectedBots: any[];
  handleBotSelectionChange: (rows: any[]) => void;
  handleOpenCreateModal: () => void;
  isModalDataLoading: boolean;
  title?: string;
}

export const BotsTab: React.FC<BotsTabProps> = ({
  bots,
  botTableData,
  selectedBots,
  handleBotSelectionChange,
  handleOpenCreateModal,
  isModalDataLoading,
  title,
}) => {
  const navigate = useNavigate();
  const botColumns = getBotColumns((id) => navigate(`/bots/${id}`));

  return (
    <Card className="bg-base-100 shadow-xl border border-base-200">
      <Card.Body>
        <div className="flex justify-between items-center mb-6">
          <Card.Title className="m-0">{title ?? 'Active Bots'}</Card.Title>
          <Button
            onClick={handleOpenCreateModal}
            variant="primary"
            size="sm"
            startIcon={<Plus className="w-4 h-4" />}
            loading={isModalDataLoading}
            disabled={isModalDataLoading}
          >
            Create Bot
          </Button>
        </div>

        {bots.length === 0 ? (
          <EmptyState
            icon="Bot"
            title="No Bots Configured"
            description="Create your first bot to get started."
            action={{
              label: 'Create Bot',
              onClick: handleOpenCreateModal,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={botColumns}
              data={botTableData}
              selectable={true}
              onSelectionChange={handleBotSelectionChange}
              selectedRows={selectedBots}
              emptyMessage="No bots found"
            />
          </div>
        )}
      </Card.Body>
    </Card>
  );
};
