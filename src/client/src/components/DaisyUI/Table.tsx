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
