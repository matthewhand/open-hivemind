export const getBotColumns = (handleNavigateToBot: (id: string) => void) => [
  {
    key: 'name',
    header: 'Bot Name',
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
  },
  {
    key: 'personaName',
    header: 'Persona',
    sortable: true,
  },
  {
    key: 'providerType',
    header: 'Platform',
    sortable: true,
  },
  {
    key: 'llmName',
    header: 'LLM Model',
    sortable: true,
  },
  {
    key: 'messageCount',
    header: 'Messages',
    sortable: true,
  },
  {
    key: 'errorCount',
    header: 'Errors',
    sortable: true,
  },
  {
    key: 'lastActive',
    header: 'Last Active',
    sortable: true,
  },
];
