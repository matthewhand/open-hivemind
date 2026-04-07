import React from 'react';
import { Bot, Plus } from 'lucide-react';
import PageHeader from '../../components/DaisyUI/PageHeader';
import Button from '../../components/DaisyUI/Button';
import Stack from '../../components/DaisyUI/Stack';

/** Stacked bot avatars shown as a visual accent next to the page title */
const SwarmAvatarStack: React.FC = () => {
  const colors = ['bg-primary', 'bg-secondary', 'bg-accent'];
  return (
    <Stack className="mr-2">
      {colors.map((color, i) => (
        <div
          key={i}
          className={`${color} text-primary-content w-8 h-8 rounded-full flex items-center justify-center shadow-sm`}
        >
          <Bot className="w-4 h-4" />
        </div>
      ))}
    </Stack>
  );
};

interface BotsPageHeaderProps {
  onCreateClick: () => void;
}

export const BotsPageHeader: React.FC<BotsPageHeaderProps> = ({
  onCreateClick,
}) => {
  return (
    <PageHeader
      title="AI Swarm Management"
      description="Configure, monitor, and deploy your specialized AI agents."
      icon={<SwarmAvatarStack />}
      actions={
        <Button
          variant="primary"
          onClick={onCreateClick}
        >
          <Plus className="w-4 h-4 mr-2" /> Create New Bot
        </Button>
      }
    />
  );
};
