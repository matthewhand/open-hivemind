import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface Trait {
  name: string;
  value: number | string;
}

interface PersonaRadarProps {
  traits: Trait[];
  size?: number;
  showLabels?: boolean;
}

const PersonaRadar: React.FC<PersonaRadarProps> = ({ traits, size = 200, showLabels = true }) => {
  // Ensure we have valid data
  if (!traits || traits.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 w-full bg-base-200/20 rounded-lg text-base-content/30 text-xs italic">
        No personality traits defined
      </div>
    );
  }

  // Ensure values are numbers for Recharts
  const chartData = traits.map(t => ({
    ...t,
    value: Number(t.value)
  }));

  return (
    <div style={{ width: '100%', height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="oklch(var(--b3))" />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fill: 'oklch(var(--bc))', fontSize: 10, opacity: 0.7 }}
            tickSize={showLabels ? 5 : 0}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Personality"
            dataKey="value"
            stroke="oklch(var(--p))"
            strokeWidth={2}
            fill="oklch(var(--p))"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PersonaRadar;
