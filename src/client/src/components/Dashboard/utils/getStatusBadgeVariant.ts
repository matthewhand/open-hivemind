export const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'online':
      return 'success';
    case 'error':
    case 'failed':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'neutral';
  }
};
