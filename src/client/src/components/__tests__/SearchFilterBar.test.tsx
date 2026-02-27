import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
