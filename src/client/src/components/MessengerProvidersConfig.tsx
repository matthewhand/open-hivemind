import React from 'react';
import { ChatBubbleLeftRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import BaseProvidersConfig from './ProviderManagement/BaseProvidersConfig';

const MessengerProvidersConfig: React.FC = () => {
  const messengerProviderTypes = [
    { value: 'discord', label: 'Discord', docsUrl: 'https://discord.com/developers/docs/intro' },
    { value: 'slack', label: 'Slack', docsUrl: 'https://api.slack.com/messaging/managing' },
    { value: 'mattermost', label: 'Mattermost', docsUrl: 'https://developers.mattermost.com/integrate/getting-started/' },
  ];

  return (
    <BaseProvidersConfig
      apiEndpoint="/api/admin/messenger-providers"
      providerTypeOptions={messengerProviderTypes}
      title="Messenger Providers"
      emptyStateIcon={<ChatBubbleLeftRightIcon className="w-16 h-16" />}
      emptyStateTitle="No Messenger Providers"
      emptyStateMessage="Configure messenger providers to connect your bots to Discord, Slack, or Mattermost."
      refreshIcon={<ArrowPathIcon className="w-5 h-5" />}
    />
  );
};

export default MessengerProvidersConfig;
