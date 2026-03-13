export const buildLastActivityLabel = (messageCount: number, connected: boolean) => {
  if (!connected) return 'Disconnected';
  if (messageCount === 0) return 'No activity yet';
  return 'Recently active';
};
