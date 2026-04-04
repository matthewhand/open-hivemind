import React, { useMemo } from 'react';
import { Stat } from '../../components/DaisyUI/Stat';
import { type Persona } from './hooks/usePersonasData';

interface PersonaStatsProps {
  personas: Persona[];
}

// Static Tailwind class mappings (dynamic construction like `text-${color}` is not JIT-safe)
const colorTextClass: Record<string, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
};

export const PersonaStats: React.FC<PersonaStatsProps> = ({ personas }) => {
  const stats = useMemo(() => {
    const active = personas.reduce((acc, p) => acc + (p.assignedBotNames?.length || 0), 0);
    const custom = personas.reduce((acc, p) => acc + (p.isBuiltIn ? 0 : 1), 0);

    return [
      {
        id: 'total',
        title: 'Total Personas',
        value: personas.length,
        icon: '✨',
        color: 'primary' as const,
        description: 'Available in swarm',
      },
      {
        id: 'active',
        title: 'Active Assignments',
        value: active,
        icon: '🤖',
        color: 'success' as const,
        description: 'Bots using personas',
      },
      {
        id: 'custom',
        title: 'Custom Personas',
        value: custom,
        icon: '🛠️',
        color: 'secondary' as const,
        description: 'User-created',
      },
    ];
  }, [personas]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Stat
          key={stat.id}
          className="bg-base-100 shadow rounded-box"
          title={<span className="text-xs font-bold uppercase opacity-50">{stat.title}</span>}
          value={stat.value}
          valueClassName={colorTextClass[stat.color] ?? ''}
          figure={stat.icon}
          figureClassName={`${colorTextClass[stat.color] ?? ''} text-3xl opacity-20`}
          description={<span className="mt-1 font-medium">{stat.description}</span>}
        />
      ))}
    </div>
  );
};
