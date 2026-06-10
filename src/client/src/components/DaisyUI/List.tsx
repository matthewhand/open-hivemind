import React from 'react';
import classNames from 'classnames';

export interface ListRowProps extends React.HTMLAttributes<HTMLLIElement> {
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
    <li className={classes} role="listitem" {...props}>
      {children}
    </li>
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

export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
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
    <ul className={classes} role="list" {...props}>
      {children}
    </ul>
  );
});

List.displayName = 'List';

export default List;
