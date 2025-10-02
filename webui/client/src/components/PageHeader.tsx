import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="text-lg text-gray-500">{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default PageHeader;