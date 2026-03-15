/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';

// Responsive Container
export const ResponsiveContainer: React.FC<{ children: React.ReactNode; breakpoint?: string; orientation?: 'portrait' | 'landscape' }> = ({ children }) => (
  <div className="container mx-auto px-4" role="region">
    {children}
  </div>
);

// Adaptive Grid
export const AdaptiveGrid: React.FC<{ children: React.ReactNode; spacing?: number; itemSpacing?: number; breakpoints?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number } }> = ({ children, spacing = 2, itemSpacing = 2, breakpoints = { xs: 12, sm: 6, md: 4, lg: 3 } }) => {
  const getColClass = (bp: string, val: number | undefined) => {
    if (!val) return '';
    const prefix = bp === 'xs' ? '' : `${bp}:`;
    return `${prefix}grid-cols-${val}`;
  };

  // Pre-define all possible grid-cols classes for Tailwind to pick up
  // These are statically analyzed by Tailwind
  const gridClasses: Record<string, Record<number, string>> = {
    xs: { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12' },
    sm: { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5', 6: 'sm:grid-cols-6', 7: 'sm:grid-cols-7', 8: 'sm:grid-cols-8', 9: 'sm:grid-cols-9', 10: 'sm:grid-cols-10', 11: 'sm:grid-cols-11', 12: 'sm:grid-cols-12' },
    md: { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6', 7: 'md:grid-cols-7', 8: 'md:grid-cols-8', 9: 'md:grid-cols-9', 10: 'md:grid-cols-10', 11: 'md:grid-cols-11', 12: 'md:grid-cols-12' },
    lg: { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6', 7: 'lg:grid-cols-7', 8: 'lg:grid-cols-8', 9: 'lg:grid-cols-9', 10: 'lg:grid-cols-10', 11: 'lg:grid-cols-11', 12: 'lg:grid-cols-12' },
    xl: { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6', 7: 'xl:grid-cols-7', 8: 'xl:grid-cols-8', 9: 'xl:grid-cols-9', 10: 'xl:grid-cols-10', 11: 'xl:grid-cols-11', 12: 'xl:grid-cols-12' },
  };

  const gapClasses: Record<number, string> = {
    0: 'gap-0', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 5: 'gap-5', 6: 'gap-6', 8: 'gap-8', 10: 'gap-10', 12: 'gap-12'
  };

  const classes = [
    'grid',
    spacing && gapClasses[spacing] ? gapClasses[spacing] : '',
    breakpoints.xs && gridClasses.xs[breakpoints.xs] ? gridClasses.xs[breakpoints.xs] : '',
    breakpoints.sm && gridClasses.sm[breakpoints.sm] ? gridClasses.sm[breakpoints.sm] : '',
    breakpoints.md && gridClasses.md[breakpoints.md] ? gridClasses.md[breakpoints.md] : '',
    breakpoints.lg && gridClasses.lg[breakpoints.lg] ? gridClasses.lg[breakpoints.lg] : '',
    breakpoints.xl && gridClasses.xl[breakpoints.xl] ? gridClasses.xl[breakpoints.xl] : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

// Responsive Card
export const ResponsiveCard: React.FC<{ title: string; subtitle?: string; content: React.ReactNode; actions?: React.ReactNode; elevation?: number; image?: string; imageHeight?: number | string; variant?: 'outlined' | 'elevation' }> = ({ title, subtitle, content, actions, elevation = 2, image, imageHeight = 200, variant = 'elevation' }) => (
  <div className={`card ${variant === 'outlined' ? 'card-bordered' : ''} shadow-${elevation}`}>
    {image && (
      <figure>
        <img src={image} alt={title} style={{ height: imageHeight }} />
      </figure>
    )}
    <div className="card-body">
      <h2 className="card-title">{title}</h2>
      {subtitle && <h3 className="text-sm opacity-70">{subtitle}</h3>}
      <div>{content}</div>
      {actions && <div className="card-actions justify-end">{actions}</div>}
    </div>
  </div>
);

// Responsive Typography
export const ResponsiveTypography: React.FC<{ children: React.ReactNode; variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2'; mobileVariant?: string; component?: React.ElementType; color?: string; align?: 'left' | 'center' | 'right' | 'justify'; gutterBottom?: boolean; noWrap?: boolean }> = ({ children, variant = 'body1', mobileVariant, component: Component = 'p', color = 'text-base-content', align = 'left', gutterBottom = false, noWrap = false }) => {
  const className = `${variant} ${mobileVariant ? `sm:${mobileVariant}` : ''} ${color} text-${align} ${gutterBottom ? 'mb-4' : ''} ${noWrap ? 'whitespace-nowrap' : ''}`;
  return <Component className={className}>{children}</Component>;
};

// Responsive Button Group
export const ResponsiveButtonGroup: React.FC<{ children: React.ReactNode; orientation?: 'horizontal' | 'vertical'; spacing?: number; fullWidth?: boolean }> = ({ children, orientation = 'horizontal', spacing = 1, fullWidth = false }) => (
  <div className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} space-${spacing} ${fullWidth ? 'w-full' : ''}`}>{children}</div>
);

// Responsive Table
export const ResponsiveTable: React.FC<{ data: any[]; columns: { key: string; header: string; render?: (value: any, item: any) => React.ReactNode; sortable?: boolean; filterable?: boolean }[]; onRowClick?: (item: any) => void; loading?: boolean; emptyMessage?: string }> = ({ data, columns, onRowClick, loading = false, emptyMessage = 'No data available' }) => {
  if (loading) {return <div className="flex justify-center py-4"><span className="loading loading-spinner" /></div>;}
  if (!data.length) {return <div className="text-center py-4">{emptyMessage}</div>;}
  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className={onRowClick ? 'cursor-pointer' : ''} onClick={() => onRowClick?.(item)}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(item[col.key], item) : item[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Responsive Navigation
export const ResponsiveNavigation: React.FC<{ items: { label: string; icon?: React.ReactNode; href?: string; onClick?: () => void; active?: boolean; disabled?: boolean }[]; orientation?: 'horizontal' | 'vertical'; variant?: 'tabs' | 'pills' | 'underline' }> = ({ items, orientation = 'horizontal', variant = 'tabs' }) => (
  <ul className={`menu ${orientation === 'vertical' ? 'menu-vertical' : 'menu-horizontal'} ${variant}`}>
    {items.map((item, idx) => (
      <li key={idx} className={item.disabled ? 'disabled' : ''}>
        <a href={item.href} onClick={item.onClick} className={item.active ? 'active' : ''}>
          {item.icon && <span className="mr-2">{item.icon}</span>}{item.label}
        </a>
      </li>
    ))}
  </ul>
);

export default {
  ResponsiveContainer,
  AdaptiveGrid,
  ResponsiveCard,
  ResponsiveTypography,
  ResponsiveButtonGroup,
  ResponsiveTable,
  ResponsiveNavigation,
};