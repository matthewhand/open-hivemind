import React from 'react';
import classNames from 'classnames';

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

export const ListRow: React.FC<ListRowProps> = React.memo(({
  className,
  children,
  ...props
}) => {
  const classes = classNames('list-row', className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
});

ListRow.displayName = 'ListRow';

export interface ListColGrowProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export const ListColGrow: React.FC<ListColGrowProps> = React.memo(({
  className,
  children,
  ...props
}) => {
  const classes = classNames('list-col-grow', className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
});

ListColGrow.displayName = 'ListColGrow';

export interface ListColWrapProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export const ListColWrap: React.FC<ListColWrapProps> = React.memo(({
  className,
  children,
  ...props
}) => {
  const classes = classNames('list-col-wrap', className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
});

ListColWrap.displayName = 'ListColWrap';

export interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

const List: React.FC<ListProps> = React.memo(({
  className,
  children,
  ...props
}) => {
  const classes = classNames('list', className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
});

List.displayName = 'List';

export default List;
