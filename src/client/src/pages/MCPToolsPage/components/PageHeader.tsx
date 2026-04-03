import React from 'react';
import { Clock, Wrench } from 'lucide-react';
import DaisyPageHeader from '../../../components/DaisyUI/PageHeader';
import Button from '../../../components/DaisyUI/Button';

interface PageHeaderProps {
  onShowHistory: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ onShowHistory }) => {
  return (
    <DaisyPageHeader
      title="MCP Tools"
      description="Browse and manage tools available from your MCP servers"
      icon={Wrench}
      actions={
        <Button variant="outline" size="sm" onClick={onShowHistory}>
          <Clock className="w-4 h-4 mr-1" /> Execution History
        </Button>
      }
    />
  );
};

export default PageHeader;
