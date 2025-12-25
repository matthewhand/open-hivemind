import React from 'react';

// Responsive Container
export const ResponsiveContainer: React.FC<{ children: React.ReactNode; breakpoint?: string; orientation?: 'portrait' | 'landscape' }> = ({ children }) => (
  <div className="container mx-auto px-4" role="region">
    {children}
  </div>
);

// Adaptive Grid
export const AdaptiveGrid: React.FC<{ children: React.ReactNode; spacing?: number; itemSpacing?: number; breakpoints?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number } }> = ({ children, spacing = 2, itemSpacing = 2, breakpoints = { xs: 12, sm: 6, md: 4, lg: 3 } }) => (
  <div className={`grid gap-${spacing} grid-cols-${breakpoints.xs}`}>
    {children}
  </div>
);

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