import React from 'react';

export const getBotColumns = (navigate: any) => [
  {
    key: 'name',
    header: 'Bot Name',
    render: (value: any, row: any) => (
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${row.status === 'online' ? 'bg-success' : 'bg-error'}`}></div>
        <span className="font-medium cursor-pointer hover:underline" onClick={() => navigate(`/bots/${row.id}`)}>{value}</span>
      </div>
    )
  },
  {
    key: 'provider',
    header: 'Provider',
    render: (value: any) => <span className="badge badge-ghost badge-sm">{value}</span>
  },
  {
    key: 'persona',
    header: 'Persona',
    render: (value: any) => <span className="text-sm opacity-80">{value}</span>
  },
  {
    key: 'messages',
    header: 'Messages',
    render: (value: any) => <span className="font-mono">{value}</span>
  },
  {
    key: 'errors',
    header: 'Errors',
    render: (value: any) => (
      <span className={`font-mono ${value > 0 ? 'text-error' : 'text-success'}`}>{value}</span>
    )
  },
  {
    key: 'actions',
    header: '',
    render: (_: any, row: any) => (
      <button
        className="btn btn-ghost btn-xs"
        onClick={() => navigate(`/bots/${row.id}`)}
      >
        View
      </button>
    )
  }
];
