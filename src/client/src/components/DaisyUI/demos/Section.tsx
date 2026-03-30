import React from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="card bg-base-100 border border-base-300">
    <div className="card-body">
      <h3 className="card-title text-lg">{title}</h3>
      {children}
    </div>
  </div>
);
