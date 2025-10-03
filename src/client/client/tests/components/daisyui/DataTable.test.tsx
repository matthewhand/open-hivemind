import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import DataTable from '@/components/DaisyUI/DataTable';

describe('DataTable Component', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' }
  ];

  const mockColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'status', label: 'Status', sortable: false }
  ];

  it('renders without crashing', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);
    
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays all column headers', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);
    
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('displays all data rows', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<DataTable data={mockData} columns={mockColumns} className="custom-table" />);
    
    const table = screen.getByRole('table');
    expect(table).toHaveClass('custom-table');
  });

  it('handles sorting when column is sortable', () => {
    const mockOnSort = jest.fn();
    render(<DataTable data={mockData} columns={mockColumns} onSort={mockOnSort} />);
    
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('handles row selection', () => {
    const mockOnSelect = jest.fn();
    render(<DataTable data={mockData} columns={mockColumns} selectable onSelect={mockOnSelect} />);
    
    const firstRow = screen.getByText('John Doe').closest('tr');
    fireEvent.click(firstRow!);
    
    expect(mockOnSelect).toHaveBeenCalledWith([mockData[0]]);
  });

  it('handles pagination', () => {
    render(<DataTable data={mockData} columns={mockColumns} pageSize={2} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DataTable data={[]} columns={mockColumns} loading />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<DataTable data={[]} columns={mockColumns} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('handles filtering', () => {
    const mockOnFilter = jest.fn();
    render(<DataTable data={mockData} columns={mockColumns} filterable onFilter={mockOnFilter} />);
    
    const filterInput = screen.getByPlaceholderText('Filter...');
    fireEvent.change(filterInput, { target: { value: 'John' } });
    
    expect(mockOnFilter).toHaveBeenCalledWith('John');
  });

  it('is accessible', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);
    
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-label', 'Data table');
  });

  it('supports custom cell rendering', () => {
    const customColumns = [
      ...mockColumns,
      {
        key: 'actions',
        label: 'Actions',
        render: (row: any) => <button data-testid={`action-${row.id}`}>Edit</button>
      }
    ];
    
    render(<DataTable data={mockData} columns={customColumns} />);
    
    expect(screen.getByTestId('action-1')).toBeInTheDocument();
    expect(screen.getByTestId('action-2')).toBeInTheDocument();
    expect(screen.getByTestId('action-3')).toBeInTheDocument();
  });
});