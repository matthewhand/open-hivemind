import React from 'react';

export interface SimpleTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Size variant matching DaisyUI table-xs, table-sm, etc. */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Alternating row colours */
  zebra?: boolean;
  /** Apply the table-compact class */
  compact?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Thin wrapper around `<table className="table ...">`.
 * Use this for hand-crafted tables where the full DataTable (columns/data arrays) is overkill.
 */
const SimpleTable: React.FC<SimpleTableProps> = ({
  size,
  zebra = false,
  compact = false,
  children,
  className = '',
  ...rest
}) => {
  const sizeClass = size ? `table-${size}` : '';
  const zebraClass = zebra ? 'table-zebra' : '';
  const compactClass = compact ? 'table-xs' : '';

  return (
    <table
      className={`table ${sizeClass} ${zebraClass} ${compactClass} ${className}`.replace(/\s+/g, ' ').trim()}
      {...rest}
    >
      {children}
    </table>
  );
};

export default SimpleTable;
