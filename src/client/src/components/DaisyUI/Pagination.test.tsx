import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pagination from './Pagination';

describe('Pagination Component', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('renders correctly with default props', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 5')).toBeInTheDocument();
  });

  it('renders correctly with compact style', () => {
    render(
      <Pagination
        currentPage={2}
        totalItems={50}
        onPageChange={mockOnPageChange}
        style="compact"
      />
    );

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
  });

  it('renders correctly with extended style', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        onPageChange={mockOnPageChange}
        style="extended"
      />
    );

    expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
  });

  it('calls onPageChange with correct page number when clicking next', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        onPageChange={mockOnPageChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Go to next page'));
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with correct page number when clicking previous', () => {
    render(
      <Pagination
        currentPage={2}
        totalItems={50}
        onPageChange={mockOnPageChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Go to previous page'));
    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with correct page number when clicking specific page', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        onPageChange={mockOnPageChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Go to page 3'));
    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous button on first page', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pagination
        currentPage={5}
        totalItems={50}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByLabelText('Go to next page')).toBeDisabled();
  });

  it('disables first and last buttons appropriately', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        onPageChange={mockOnPageChange}
        style="extended"
      />
    );

    expect(screen.getByLabelText('Go to first page')).toBeDisabled();
  });

  it('renders with custom page size', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={100}
        pageSize={25}
        onPageChange={mockOnPageChange}
      />
    );

    // With 100 items and page size 25, we should have 4 total pages
    expect(screen.getByLabelText('Go to page 4')).toBeInTheDocument();
  });

  it('handles edge cases with total items', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={0}
        onPageChange={mockOnPageChange}
      />
    );

    // With 0 total items, component should render null (no pagination)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('handles single page case', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={5}
        pageSize={10}
        onPageChange={mockOnPageChange}
      />
    );

    // With 5 items and page size 10, we should have 1 total page
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders ellipsis for large page ranges', () => {
    render(
      <Pagination
        currentPage={5}
        totalItems={100}
        pageSize={10}
        onPageChange={mockOnPageChange}
      />
    );

    // With 100 items and page size 10, we should have 10 total pages
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('renders first and last page with ellipsis for large page ranges', () => {
    render(
      <Pagination
        currentPage={5}
        totalItems={100}
        pageSize={5}
        onPageChange={mockOnPageChange}
      />
    );

    // With 100 items and page size 5, we should have 20 total pages
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('has correct ARIA attributes for accessibility', () => {
    render(
      <Pagination
        currentPage={3}
        totalItems={50}
        onPageChange={mockOnPageChange}
      />
    );

    const activePageButton = screen.getByLabelText('Go to page 3');
    expect(activePageButton).toHaveAttribute('aria-current', 'page');
  });
});