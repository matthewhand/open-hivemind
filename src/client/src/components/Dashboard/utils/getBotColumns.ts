import { BotTableRow } from '../../UnifiedDashboard';

export const getBotColumns = () => {
  return [
    { key: 'name', label: 'Name' },
    { key: 'provider', label: 'Provider' },
    { key: 'llm', label: 'LLM' },
    { key: 'status', label: 'Status' },
    { key: 'connected', label: 'Connected' },
  ];
};
