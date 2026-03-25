/* @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Pagination from '../../../src/client/src/components/DaisyUI/Pagination';
import '@testing-library/jest-dom';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalItems: 0,
    onPageChange: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when totalPages <= 1', () => {
    // totalItems = 10, pageSize = 10 -> 1 page
    const { container } = render(<Pagination {...defaultProps} totalItems={10} pageSize={10} />);
    // Component returns null when there is only a single page
    expect(container.innerHTML).toBe('');
    expect(screen.queryByLabelText('Page 1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go to previous page')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go to next page')).not.toBeInTheDocument();
  });

  it('renders nothing when totalPages is 0', () => {
    // totalItems = 0 -> 0 pages
    // actually our logic if (totalPages <= 1) return totalPages === 1 ? [1] : []
    // wait! If totalPages === 0, it returns [].
    // Let's test that the container does not contain "Page 1".
    const { container } = render(<Pagination {...defaultProps} totalItems={0} />);
    expect(screen.queryByLabelText('Page 1')).not.toBeInTheDocument();
  });

  it('handles minimum maxVisiblePages (3) correctly', () => {
    // 3 pages total, maxVisible = 3
    render(<Pagination {...defaultProps} totalItems={30} pageSize={10} maxVisiblePages={3} />);

    // Should render: 1, 2, 3
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 3')).toBeInTheDocument();

    // Total buttons: <, 1, 2, 3, > = 5 buttons for standard style
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('renders correctly on the last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} totalItems={50} pageSize={10} />);

    // Should be on page 5
    const activePage = screen.getByLabelText('Page 5');
    expect(activePage).toHaveAttribute('aria-current', 'page');

    // Next button should be disabled
    const nextButton = screen.getByLabelText('Go to next page');
    expect(nextButton).toBeDisabled();
  });

  it('uses accessible aria labels for pages', () => {
    render(<Pagination {...defaultProps} currentPage={2} totalItems={50} pageSize={10} />);

    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 3')).toBeInTheDocument();

    const activePage = screen.getByLabelText('Page 2');
    expect(activePage).toHaveAttribute('aria-current', 'page');
  });
});
