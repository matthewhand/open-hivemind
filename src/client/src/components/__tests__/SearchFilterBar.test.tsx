import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SearchFilterBar from '../SearchFilterBar';

describe('SearchFilterBar', () => {
  it('renders correctly with placeholder', () => {
    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={jest.fn()}
        searchPlaceholder="Test Search"
      />
    );
    expect(screen.getByPlaceholderText('Test Search')).toBeInTheDocument();
  });

  it('renders clear button when searchValue is present', () => {
    const handleSearchChange = jest.fn();
    render(
      <SearchFilterBar
        searchValue="test"
        onSearchChange={handleSearchChange}
      />
    );
    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();
  });

  it('does not render clear button when searchValue is empty', () => {
    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={jest.fn()}
      />
    );
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('calls onSearchChange with empty string when clear button is clicked', () => {
    const handleSearchChange = jest.fn();
    const handleClear = jest.fn();
    render(
      <SearchFilterBar
        searchValue="test"
        onSearchChange={handleSearchChange}
        onClear={handleClear}
      />
    );
    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);
    expect(handleSearchChange).toHaveBeenCalledWith('');
    expect(handleClear).toHaveBeenCalled();
  });

  it('clear button should have pointer-events-auto and stacking context classes', () => {
    render(
      <SearchFilterBar
        searchValue="test"
        onSearchChange={jest.fn()}
      />
    );
    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toHaveClass('pointer-events-auto');
    expect(clearButton).toHaveClass('relative');
    expect(clearButton).toHaveClass('z-10');
  });

  it('input should have pr-10 class for padding', () => {
    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={jest.fn()}
      />
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('pr-10');
  });
});

  it('renders active filter chips', () => {
    const handleFilterChange = jest.fn();
    const mockFilters = [
      {
        key: 'category',
        value: 'general',
        onChange: handleFilterChange,
        options: [
          { value: 'all', label: 'All Categories' },
          { value: 'general', label: 'General' }
        ]
      }
    ];

    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={jest.fn()}
        filters={mockFilters}
      />
    );

    // The chip should display the label "General" and key "category:"
    expect(screen.getByText('category:')).toBeInTheDocument();
    expect(screen.getAllByText('General')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Active filter: category General/ })).toBeInTheDocument();
  });

  it('does not render chips for "all" or empty values', () => {
    const mockFilters = [
      {
        key: 'category',
        value: 'all',
        onChange: jest.fn(),
        options: [
          { value: 'all', label: 'All Categories' }
        ]
      },
      {
        key: 'status',
        value: '',
        onChange: jest.fn(),
        options: [
          { value: '', label: 'All Statuses' }
        ]
      }
    ];

    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={jest.fn()}
        filters={mockFilters}
      />
    );

    expect(screen.queryByText('category:')).not.toBeInTheDocument();
    expect(screen.queryByText('status:')).not.toBeInTheDocument();
  });

  it('triggers onChange with default value after clear animation timeout', () => {
    jest.useFakeTimers();
    const handleFilterChange = jest.fn();
    const mockFilters = [
      {
        key: 'category',
        value: 'general',
        onChange: handleFilterChange,
        options: [
          { value: 'all', label: 'All Categories' },
          { value: 'general', label: 'General' }
        ]
      }
    ];

    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={jest.fn()}
        filters={mockFilters}
      />
    );

    const clearButton = screen.getByRole('button', { name: /Active filter: category General/ });

    act(() => { fireEvent.click(clearButton); });

    // Should not have been called immediately due to animation
    expect(handleFilterChange).not.toHaveBeenCalled();

    // Fast forward time
    act(() => { jest.advanceTimersByTime(250); });

    // Should be called with 'all'
    expect(handleFilterChange).toHaveBeenCalledWith('all');
    jest.useRealTimers();
  });
