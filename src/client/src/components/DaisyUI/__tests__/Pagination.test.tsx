import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '../Pagination';

describe('Pagination Component', () => {
  it('happy path: renders correctly and calls onPageChange', () => {
    const handlePageChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        pageSize={10}
        onPageChange={handlePageChange}
      />
    );

    // Should render pages 1 through 5
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // Click page 3
    fireEvent.click(screen.getByText('3'));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('error/edge case: returns null when totalPages <= 1', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalItems={10}
        pageSize={10}
        onPageChange={() => {}}
      />
    );

    // The component should render nothing (null)
    expect(container.firstChild).toBeNull();
  });

  it('edge case: Arrow key navigation triggers previous and next', () => {
    const handlePageChange = vi.fn();
    render(
      <Pagination
        currentPage={5}
        totalItems={100}
        pageSize={10}
        onPageChange={handlePageChange}
      />
    );

    const container = screen.getByRole('navigation');

    // Press ArrowRight
    fireEvent.keyDown(container, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(handlePageChange).toHaveBeenCalledWith(6);

    // Press ArrowLeft
    fireEvent.keyDown(container, { key: 'ArrowLeft', code: 'ArrowLeft' });
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });
});
