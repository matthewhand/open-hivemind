import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SearchFilterBar from '../SearchFilterBar';

describe('SearchFilterBar', () => {
  it('renders correctly with placeholder', () => {
    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchPlaceholder="Custom Search..."
      />
    );

    const input = screen.getByPlaceholderText('Custom Search...');
    expect(input).toBeInTheDocument();
  });

  it('renders clear button when searchValue is present', () => {
    render(
      <SearchFilterBar
        searchValue="test query"
        onSearchChange={vi.fn()}
      />
    );

    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();
  });

  it('does not render clear button when searchValue is empty', () => {
    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
      />
    );

    const clearButton = screen.queryByLabelText('Clear search');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('calls onSearchChange with empty string when clear button is clicked', () => {
    const mockOnSearchChange = vi.fn();
    render(
      <SearchFilterBar
        searchValue="test query"
        onSearchChange={mockOnSearchChange}
      />
    );

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  });

  it.skip('clear button tooltip should have pointer-events-auto and stacking context classes', () => {
    render(
      <SearchFilterBar
        searchValue="test query"
        onSearchChange={vi.fn()}
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
        searchValue="test query"
        onSearchChange={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toHaveClass('pr-10');
  });
});
