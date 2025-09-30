import React from 'react';

export interface GridProps {
  children: React.ReactNode;
  container?: boolean;
  item?: boolean;
  xs?: number | 'auto';
  sm?: number | 'auto';
  md?: number | 'auto';
  lg?: number | 'auto';
  xl?: number | 'auto';
  spacing?: number;
  direction?: 'row' | 'column';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'stretch' | 'center' | 'flex-start' | 'flex-end' | 'baseline';
  className?: string;
  style?: React.CSSProperties;
}

const Grid: React.FC<GridProps> = ({
  children,
  container = false,
  item = false,
  xs,
  sm,
  md,
  lg,
  xl,
  spacing = 0,
  direction = 'row',
  justify,
  alignItems,
  className = '',
  style,
  ...props
}) => {
  const getColumnClasses = () => {
    const classes: string[] = [];
    
    if (xs !== undefined) {
      classes.push(xs === 'auto' ? 'col-auto' : `col-span-${xs}`);
    }
    if (sm !== undefined) {
      classes.push(xs === 'auto' ? 'sm:col-auto' : `sm:col-span-${sm}`);
    }
    if (md !== undefined) {
      classes.push(xs === 'auto' ? 'md:col-auto' : `md:col-span-${md}`);
    }
    if (lg !== undefined) {
      classes.push(xs === 'auto' ? 'lg:col-auto' : `lg:col-span-${lg}`);
    }
    if (xl !== undefined) {
      classes.push(xs === 'auto' ? 'xl:col-auto' : `xl:col-span-${xl}`);
    }
    
    return classes;
  };

  const getSpacingClasses = () => {
    if (spacing === 0) return '';
    
    const spacingMap = {
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      5: 'gap-5',
      6: 'gap-6',
      8: 'gap-8',
    };
    
    return spacingMap[spacing as keyof typeof spacingMap] || `gap-${spacing}`;
  };

  const getJustifyClasses = () => {
    if (!justify) return '';
    
    const justifyMap = {
      'flex-start': 'justify-start',
      'center': 'justify-center',
      'flex-end': 'justify-end',
      'space-between': 'justify-between',
      'space-around': 'justify-around',
      'space-evenly': 'justify-evenly',
    };
    
    return justifyMap[justify];
  };

  const getAlignItemsClasses = () => {
    if (!alignItems) return '';
    
    const alignMap = {
      'stretch': 'items-stretch',
      'center': 'items-center',
      'flex-start': 'items-start',
      'flex-end': 'items-end',
      'baseline': 'items-baseline',
    };
    
    return alignMap[alignItems];
  };

  if (container) {
    const classes = [
      'grid grid-cols-12',
      direction === 'column' ? 'grid-flow-col' : '',
      getSpacingClasses(),
      getJustifyClasses(),
      getAlignItemsClasses(),
      className,
    ].filter(Boolean).join(' ');

    return (
      <div className={classes} style={style} {...props}>
        {children}
      </div>
    );
  }

  if (item) {
    const classes = [
      ...getColumnClasses(),
      className,
    ].filter(Boolean).join(' ');

    return (
      <div className={classes} style={style} {...props}>
        {children}
      </div>
    );
  }

  // Regular div if neither container nor item
  return (
    <div className={className} style={style} {...props}>
      {children}
    </div>
  );
};

export default Grid;