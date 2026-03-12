import React from 'react';

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title = 'Dashboard',
  subtitle,
}) => (
  <div className="mb-4">
    <h1 className="text-2xl font-bold">{title}</h1>
    {subtitle && <p className="text-sm text-base-content/60">{subtitle}</p>}
  </div>
);
