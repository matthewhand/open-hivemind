/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import React from 'react';
import { twMerge } from 'tailwind-merge';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> { }

const Table: React.FC<TableProps> = ({ className, children, ...props }) => {
  return (
    <table className={twMerge('table', className)} {...props}>
      {children}
    </table>
  );
};

export default Table;
