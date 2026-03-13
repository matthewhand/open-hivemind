export const getProviderEmoji = (provider: string) => {
  switch (provider.toLowerCase()) {
    case 'discord':
      return '👾';
    case 'slack':
      return '💬';
    case 'mattermost':
      return '📱';
    case 'teams':
      return '💼';
    default:
      return '🤖';
  }
};
