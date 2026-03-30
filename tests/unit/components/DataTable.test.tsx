/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataTable from '../../../src/client/src/components/DaisyUI/DataTable';

type Row = { id: number; name: string; age: number };

const columns = [
  { key: 'id' as const, title: 'ID' },
  { key: 'name' as const, title: 'Name', sortable: true },
  { key: 'age' as const, title: 'Age', sortable: true },
];

const data: Row[] = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Charlie', age: 35 },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable data={data} columns={columns} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable data={data} columns={columns} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    render(<DataTable data={[]} columns={columns} />);
    expect(screen.getByText('No data to display.')).toBeInTheDocument();
  });

  it('renders skeleton loading state', () => {
    const { container } = render(<DataTable data={[]} columns={columns} loading />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('sorts data when clicking a sortable column header', () => {
    render(<DataTable data={data} columns={columns} />);
    // Click Name header to sort ascending
    fireEvent.click(screen.getByText('Name'));
    const cells = screen.getAllByRole('cell');
    const nameValues = cells
      .filter((_, i) => i % 3 === 1) // Name is 2nd column (index 1 of each row)
      .map((cell) => cell.textContent);
    expect(nameValues).toEqual(['Alice', 'Bob', 'Charlie']);

    // Click again for descending
    fireEvent.click(screen.getByText('Name'));
    const cellsDesc = screen.getAllByRole('cell');
    const nameDesc = cellsDesc
      .filter((_, i) => i % 3 === 1)
      .map((cell) => cell.textContent);
    expect(nameDesc).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('paginates data', () => {
    const largeData = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      age: 20 + i,
    }));
    render(
      <DataTable
        data={largeData}
        columns={columns}
        pagination={{ pageSize: 5, pageSizeOptions: [5, 10] }}
      />,
    );
    // Should show first 5 rows
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 5')).toBeInTheDocument();
    expect(screen.queryByText('User 6')).not.toBeInTheDocument();

    // Navigate to next page
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByText('User 6')).toBeInTheDocument();
    expect(screen.queryByText('User 1')).not.toBeInTheDocument();
  });

  it('filters via search input', () => {
    render(<DataTable data={data} columns={columns} searchable />);
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'alice' } });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = jest.fn();
    render(<DataTable data={data} columns={columns} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(data[0], 0);
  });

  it('uses custom render function for columns', () => {
    const customColumns = [
      ...columns.slice(0, 2),
      {
        key: 'age' as const,
        title: 'Age',
        render: (val: number) => <span data-testid="custom-age">{val} years</span>,
      },
    ];
    render(<DataTable data={data} columns={customColumns} />);
    expect(screen.getAllByTestId('custom-age')).toHaveLength(3);
    expect(screen.getByText('30 years')).toBeInTheDocument();
  });
});
